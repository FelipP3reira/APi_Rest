import { Prisma, type Equipamento, type UnidadeEquipamento } from '@prisma/client';

import {
  ErroConflito,
  ErroNaoEncontrado,
  ErroValidacao,
} from '../../shared/erros/erros-aplicacao.js';
import { calcularSkip, montarPagina, type PaginaResultado } from '../../shared/http/paginacao.js';
import { prisma } from '../../shared/prisma/cliente.js';
import type {
  AtualizarEquipamento,
  CriarEquipamento,
  ListarEquipamentosQuery,
} from './equipamentos.schema.js';

const CATEGORIA_INEXISTENTE = 'A categoria informada não existe.';

export async function criarEquipamento(dados: CriarEquipamento): Promise<Equipamento> {
  try {
    return await prisma.equipamento.create({ data: dados });
  } catch (erro) {
    if (chaveEstrangeiraInvalida(erro)) {
      throw new ErroValidacao(CATEGORIA_INEXISTENTE, { categoriaId: [CATEGORIA_INEXISTENTE] });
    }
    throw erro;
  }
}

export async function buscarEquipamento(id: string): Promise<Equipamento> {
  const equipamento = await prisma.equipamento.findUnique({ where: { id } });
  if (!equipamento) {
    throw new ErroNaoEncontrado('Equipamento não encontrado.');
  }
  return equipamento;
}

export async function listarEquipamentos(
  query: ListarEquipamentosQuery,
): Promise<PaginaResultado<Equipamento>> {
  const filtro = montarFiltro(query);

  const [total, registros] = await prisma.$transaction([
    prisma.equipamento.count({ where: filtro }),
    prisma.equipamento.findMany({
      where: filtro,
      orderBy: { [query.ordenarPor]: query.ordem },
      skip: calcularSkip(query.pagina, query.porPagina),
      take: query.porPagina,
    }),
  ]);

  return montarPagina(registros, total, query.pagina, query.porPagina);
}

export async function atualizarEquipamento(
  id: string,
  dados: AtualizarEquipamento,
): Promise<Equipamento> {
  try {
    return await prisma.equipamento.update({ where: { id }, data: dados });
  } catch (erro) {
    if (registroNaoEncontrado(erro)) {
      throw new ErroNaoEncontrado('Equipamento não encontrado.');
    }
    if (chaveEstrangeiraInvalida(erro)) {
      throw new ErroValidacao(CATEGORIA_INEXISTENTE, { categoriaId: [CATEGORIA_INEXISTENTE] });
    }
    throw erro;
  }
}

export async function removerEquipamento(id: string): Promise<void> {
  try {
    await prisma.equipamento.delete({ where: { id } });
  } catch (erro) {
    if (registroNaoEncontrado(erro)) {
      throw new ErroNaoEncontrado('Equipamento não encontrado.');
    }
    if (chaveEstrangeiraInvalida(erro)) {
      throw new ErroConflito('Equipamento tem unidades cadastradas e não pode ser removido.');
    }
    throw erro;
  }
}

export async function consultarDisponibilidade(
  equipamentoId: string,
  de: Date,
  ate: Date,
): Promise<UnidadeEquipamento[]> {
  await buscarEquipamento(equipamentoId);

  return prisma.unidadeEquipamento.findMany({
    where: {
      equipamentoId,
      status: 'DISPONIVEL',
      locacoes: { none: ocupadasNoPeriodo(de, ate) },
    },
    orderBy: { patrimonio: 'asc' },
  });
}

function montarFiltro(query: ListarEquipamentosQuery): Prisma.EquipamentoWhereInput {
  const filtro: Prisma.EquipamentoWhereInput = {};

  if (query.categoriaId) {
    filtro.categoriaId = query.categoriaId;
  }
  if (query.ativo !== undefined) {
    filtro.ativo = query.ativo;
  }
  if (query.precoMin !== undefined || query.precoMax !== undefined) {
    filtro.valorDiariaCentavos = {
      ...(query.precoMin !== undefined ? { gte: query.precoMin } : {}),
      ...(query.precoMax !== undefined ? { lte: query.precoMax } : {}),
    };
  }
  if (query.disponivelDe && query.disponivelAte) {
    filtro.unidades = {
      some: {
        status: 'DISPONIVEL',
        locacoes: { none: ocupadasNoPeriodo(query.disponivelDe, query.disponivelAte) },
      },
    };
  }

  return filtro;
}

function ocupadasNoPeriodo(de: Date, ate: Date): Prisma.LocacaoWhereInput {
  return {
    status: { not: 'CANCELADA' },
    inicioEm: { lte: ate },
    fimEm: { gte: de },
  };
}

function chaveEstrangeiraInvalida(erro: unknown): boolean {
  return erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2003';
}

function registroNaoEncontrado(erro: unknown): boolean {
  return erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2025';
}
