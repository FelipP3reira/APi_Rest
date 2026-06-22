import { Prisma, type UnidadeEquipamento } from '@prisma/client';

import {
  ErroConflito,
  ErroNaoEncontrado,
  ErroValidacao,
} from '../../shared/erros/erros-aplicacao.js';
import { prisma } from '../../shared/prisma/cliente.js';
import type { AtualizarUnidade, CriarUnidade } from './unidades.schema.js';

const PATRIMONIO_DUPLICADO = 'Já existe uma unidade com esse patrimônio.';

export async function criarUnidade(
  equipamentoId: string,
  dados: CriarUnidade,
): Promise<UnidadeEquipamento> {
  try {
    return await prisma.unidadeEquipamento.create({ data: { ...dados, equipamentoId } });
  } catch (erro) {
    if (violouUnicidade(erro)) {
      throw new ErroConflito(PATRIMONIO_DUPLICADO);
    }
    if (chaveEstrangeiraInvalida(erro)) {
      throw new ErroValidacao('O equipamento informado não existe.');
    }
    throw erro;
  }
}

export async function listarUnidadesDoEquipamento(
  equipamentoId: string,
): Promise<UnidadeEquipamento[]> {
  const equipamento = await prisma.equipamento.findUnique({
    where: { id: equipamentoId },
    select: { id: true },
  });
  if (!equipamento) {
    throw new ErroNaoEncontrado('Equipamento não encontrado.');
  }

  return prisma.unidadeEquipamento.findMany({
    where: { equipamentoId },
    orderBy: { patrimonio: 'asc' },
  });
}

export async function atualizarUnidade(
  id: string,
  dados: AtualizarUnidade,
): Promise<UnidadeEquipamento> {
  try {
    return await prisma.unidadeEquipamento.update({ where: { id }, data: dados });
  } catch (erro) {
    if (registroNaoEncontrado(erro)) {
      throw new ErroNaoEncontrado('Unidade não encontrada.');
    }
    if (violouUnicidade(erro)) {
      throw new ErroConflito(PATRIMONIO_DUPLICADO);
    }
    throw erro;
  }
}

export async function removerUnidade(id: string): Promise<void> {
  try {
    await prisma.unidadeEquipamento.delete({ where: { id } });
  } catch (erro) {
    if (registroNaoEncontrado(erro)) {
      throw new ErroNaoEncontrado('Unidade não encontrada.');
    }
    if (chaveEstrangeiraInvalida(erro)) {
      throw new ErroConflito('Unidade tem locações registradas e não pode ser removida.');
    }
    throw erro;
  }
}

function violouUnicidade(erro: unknown): boolean {
  return erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002';
}

function chaveEstrangeiraInvalida(erro: unknown): boolean {
  return erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2003';
}

function registroNaoEncontrado(erro: unknown): boolean {
  return erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2025';
}
