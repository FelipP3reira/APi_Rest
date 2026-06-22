import { Prisma, StatusLocacao } from '@prisma/client';

import { ErroConflito, ErroNaoEncontrado } from '../../shared/erros/erros-aplicacao.js';
import { calcularSkip, montarPagina, type PaginaResultado } from '../../shared/http/paginacao.js';
import { prisma } from '../../shared/prisma/cliente.js';
import type { CriarLocacao, ListarLocacoesQuery } from './locacoes.schema.js';

const STATUS_LEGIVEL: Record<StatusLocacao, string> = {
  RESERVADA: 'reservada',
  RETIRADA: 'retirada',
  DEVOLVIDA: 'devolvida',
  CANCELADA: 'cancelada',
};

const COM_UNIDADE = {
  unidade: { select: { equipamentoId: true, patrimonio: true } },
} satisfies Prisma.LocacaoInclude;

export type LocacaoDetalhada = Prisma.LocacaoGetPayload<{ include: typeof COM_UNIDADE }>;

const MILISSEGUNDOS_POR_DIA = 86_400_000;
const SEM_UNIDADE = 'Não há unidade disponível para o período informado.';

export async function criarLocacao(dados: CriarLocacao): Promise<LocacaoDetalhada> {
  try {
    return await prisma.$transaction(async (tx) => {
      await garantirCliente(tx, dados.clienteId);
      const valorDiariaCentavos = await garantirEquipamentoLocavel(tx, dados.equipamentoId);

      const unidadeId = await alocarUnidadeLivre(
        tx,
        dados.equipamentoId,
        dados.inicioEm,
        dados.fimEm,
      );
      if (!unidadeId) {
        throw new ErroConflito(SEM_UNIDADE);
      }

      return tx.locacao.create({
        data: {
          clienteId: dados.clienteId,
          unidadeId,
          inicioEm: dados.inicioEm,
          fimEm: dados.fimEm,
          valorTotalCentavos: calcularValor(valorDiariaCentavos, dados.inicioEm, dados.fimEm),
        },
        include: COM_UNIDADE,
      });
    });
  } catch (erro) {
    // Rede de segurança: se duas requisições passarem pela seleção e colidirem,
    // a EXCLUDE constraint do banco rejeita a segunda. Traduzimos para 409.
    if (colisaoDePeriodo(erro)) {
      throw new ErroConflito(SEM_UNIDADE);
    }
    throw erro;
  }
}

export async function buscarLocacao(id: string): Promise<LocacaoDetalhada> {
  const locacao = await prisma.locacao.findUnique({ where: { id }, include: COM_UNIDADE });
  if (!locacao) {
    throw new ErroNaoEncontrado('Locação não encontrada.');
  }
  return locacao;
}

export async function listarLocacoes(
  query: ListarLocacoesQuery,
): Promise<PaginaResultado<LocacaoDetalhada>> {
  const filtro: Prisma.LocacaoWhereInput = {};
  if (query.status) {
    filtro.status = query.status;
  }
  if (query.clienteId) {
    filtro.clienteId = query.clienteId;
  }
  if (query.equipamentoId) {
    filtro.unidade = { equipamentoId: query.equipamentoId };
  }
  if (query.de && query.ate) {
    filtro.inicioEm = { lte: query.ate };
    filtro.fimEm = { gte: query.de };
  }

  const [total, registros] = await prisma.$transaction([
    prisma.locacao.count({ where: filtro }),
    prisma.locacao.findMany({
      where: filtro,
      include: COM_UNIDADE,
      orderBy: { [query.ordenarPor]: query.ordem },
      skip: calcularSkip(query.pagina, query.porPagina),
      take: query.porPagina,
    }),
  ]);

  return montarPagina(registros, total, query.pagina, query.porPagina);
}

export async function registrarRetirada(id: string): Promise<LocacaoDetalhada> {
  return transicionar(
    id,
    StatusLocacao.RESERVADA,
    StatusLocacao.RETIRADA,
    { retiradaEm: new Date() },
    'registrar a retirada',
  );
}

export async function registrarDevolucao(id: string): Promise<LocacaoDetalhada> {
  return transicionar(
    id,
    StatusLocacao.RETIRADA,
    StatusLocacao.DEVOLVIDA,
    { devolvidaEm: new Date() },
    'registrar a devolução',
  );
}

export async function cancelarLocacao(id: string): Promise<LocacaoDetalhada> {
  return transicionar(id, StatusLocacao.RESERVADA, StatusLocacao.CANCELADA, {}, 'cancelar');
}

// A transição é um UPDATE condicionado ao status atual, então duas chamadas
// simultâneas (ex.: retirar duas vezes) não passam as duas: só a que casar com o
// status esperado afeta a linha; a outra cai no count === 0.
async function transicionar(
  id: string,
  statusEsperado: StatusLocacao,
  novoStatus: StatusLocacao,
  camposExtra: Prisma.LocacaoUpdateManyMutationInput,
  acao: string,
): Promise<LocacaoDetalhada> {
  const resultado = await prisma.locacao.updateMany({
    where: { id, status: statusEsperado },
    data: { status: novoStatus, ...camposExtra },
  });

  if (resultado.count === 0) {
    const existente = await prisma.locacao.findUnique({ where: { id }, select: { status: true } });
    if (!existente) {
      throw new ErroNaoEncontrado('Locação não encontrada.');
    }
    throw new ErroConflito(
      `Não dá para ${acao}: a locação está ${STATUS_LEGIVEL[existente.status]}.`,
    );
  }

  return buscarLocacao(id);
}

async function garantirCliente(tx: Prisma.TransactionClient, clienteId: string): Promise<void> {
  const cliente = await tx.cliente.findUnique({ where: { id: clienteId }, select: { id: true } });
  if (!cliente) {
    throw new ErroNaoEncontrado('Cliente não encontrado.');
  }
}

async function garantirEquipamentoLocavel(
  tx: Prisma.TransactionClient,
  equipamentoId: string,
): Promise<number> {
  const equipamento = await tx.equipamento.findUnique({
    where: { id: equipamentoId },
    select: { ativo: true, valorDiariaCentavos: true },
  });
  if (!equipamento) {
    throw new ErroNaoEncontrado('Equipamento não encontrado.');
  }
  if (!equipamento.ativo) {
    throw new ErroConflito('Equipamento inativo não pode ser locado.');
  }
  return equipamento.valorDiariaCentavos;
}

// Seleciona e trava uma unidade livre no período. O FOR UPDATE ... SKIP LOCKED
// serializa a disputa: requisições concorrentes pulam a linha já travada em vez
// de enxergarem a mesma unidade como disponível.
async function alocarUnidadeLivre(
  tx: Prisma.TransactionClient,
  equipamentoId: string,
  inicioEm: Date,
  fimEm: Date,
): Promise<string | null> {
  const livres = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT u.id
    FROM unidades_equipamento u
    WHERE u."equipamentoId" = ${equipamentoId}::uuid
      AND u.status = 'DISPONIVEL'
      AND NOT EXISTS (
        SELECT 1 FROM locacoes l
        WHERE l."unidadeId" = u.id
          AND l.status <> 'CANCELADA'
          AND l."inicioEm" <= ${fimEm}::date
          AND l."fimEm" >= ${inicioEm}::date
      )
    ORDER BY u."criadoEm"
    FOR UPDATE OF u SKIP LOCKED
    LIMIT 1
  `);

  return livres[0]?.id ?? null;
}

function calcularValor(valorDiariaCentavos: number, inicioEm: Date, fimEm: Date): number {
  const dias = Math.round((fimEm.getTime() - inicioEm.getTime()) / MILISSEGUNDOS_POR_DIA) + 1;
  return dias * valorDiariaCentavos;
}

function colisaoDePeriodo(erro: unknown): boolean {
  return (
    erro instanceof Prisma.PrismaClientKnownRequestError &&
    (erro.code === 'P2002' || erro.message.includes('locacoes_sem_sobreposicao'))
  );
}
