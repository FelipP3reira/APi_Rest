import { Prisma, type Cliente } from '@prisma/client';

import { ErroConflito, ErroNaoEncontrado } from '../../shared/erros/erros-aplicacao.js';
import { calcularSkip, montarPagina, type PaginaResultado } from '../../shared/http/paginacao.js';
import { prisma } from '../../shared/prisma/cliente.js';
import type { AtualizarCliente, CriarCliente, ListarClientesQuery } from './clientes.schema.js';

const DOCUMENTO_DUPLICADO = 'Já existe um cliente com esse documento.';

export async function criarCliente(dados: CriarCliente): Promise<Cliente> {
  try {
    return await prisma.cliente.create({ data: dados });
  } catch (erro) {
    if (violouUnicidade(erro)) {
      throw new ErroConflito(DOCUMENTO_DUPLICADO);
    }
    throw erro;
  }
}

export async function buscarCliente(id: string): Promise<Cliente> {
  const cliente = await prisma.cliente.findUnique({ where: { id } });
  if (!cliente) {
    throw new ErroNaoEncontrado('Cliente não encontrado.');
  }
  return cliente;
}

export async function listarClientes(
  query: ListarClientesQuery,
): Promise<PaginaResultado<Cliente>> {
  const filtro: Prisma.ClienteWhereInput = {};
  if (query.nome) {
    filtro.nome = { contains: query.nome, mode: 'insensitive' };
  }
  if (query.documento) {
    filtro.documento = { contains: query.documento.replace(/\D/g, '') };
  }

  const [total, registros] = await prisma.$transaction([
    prisma.cliente.count({ where: filtro }),
    prisma.cliente.findMany({
      where: filtro,
      orderBy: { [query.ordenarPor]: query.ordem },
      skip: calcularSkip(query.pagina, query.porPagina),
      take: query.porPagina,
    }),
  ]);

  return montarPagina(registros, total, query.pagina, query.porPagina);
}

export async function atualizarCliente(id: string, dados: AtualizarCliente): Promise<Cliente> {
  try {
    return await prisma.cliente.update({ where: { id }, data: dados });
  } catch (erro) {
    if (registroNaoEncontrado(erro)) {
      throw new ErroNaoEncontrado('Cliente não encontrado.');
    }
    if (violouUnicidade(erro)) {
      throw new ErroConflito(DOCUMENTO_DUPLICADO);
    }
    throw erro;
  }
}

export async function removerCliente(id: string): Promise<void> {
  try {
    await prisma.cliente.delete({ where: { id } });
  } catch (erro) {
    if (registroNaoEncontrado(erro)) {
      throw new ErroNaoEncontrado('Cliente não encontrado.');
    }
    if (temVinculo(erro)) {
      throw new ErroConflito('Cliente tem locações registradas e não pode ser removido.');
    }
    throw erro;
  }
}

function violouUnicidade(erro: unknown): boolean {
  return erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002';
}

function registroNaoEncontrado(erro: unknown): boolean {
  return erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2025';
}

function temVinculo(erro: unknown): boolean {
  return erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2003';
}
