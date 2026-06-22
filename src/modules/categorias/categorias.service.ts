import { Prisma, type Categoria } from '@prisma/client';

import { ErroConflito, ErroNaoEncontrado } from '../../shared/erros/erros-aplicacao.js';
import { calcularSkip, montarPagina, type PaginaResultado } from '../../shared/http/paginacao.js';
import { prisma } from '../../shared/prisma/cliente.js';
import type {
  AtualizarCategoria,
  CriarCategoria,
  ListarCategoriasQuery,
} from './categorias.schema.js';

const NOME_DUPLICADO = 'Já existe uma categoria com esse nome.';

export async function criarCategoria(dados: CriarCategoria): Promise<Categoria> {
  try {
    return await prisma.categoria.create({ data: dados });
  } catch (erro) {
    if (violouUnicidade(erro)) {
      throw new ErroConflito(NOME_DUPLICADO);
    }
    throw erro;
  }
}

export async function buscarCategoria(id: string): Promise<Categoria> {
  const categoria = await prisma.categoria.findUnique({ where: { id } });
  if (!categoria) {
    throw new ErroNaoEncontrado('Categoria não encontrada.');
  }
  return categoria;
}

export async function listarCategorias(
  query: ListarCategoriasQuery,
): Promise<PaginaResultado<Categoria>> {
  const filtro: Prisma.CategoriaWhereInput = query.nome
    ? { nome: { contains: query.nome, mode: 'insensitive' } }
    : {};

  const [total, registros] = await prisma.$transaction([
    prisma.categoria.count({ where: filtro }),
    prisma.categoria.findMany({
      where: filtro,
      orderBy: { [query.ordenarPor]: query.ordem },
      skip: calcularSkip(query.pagina, query.porPagina),
      take: query.porPagina,
    }),
  ]);

  return montarPagina(registros, total, query.pagina, query.porPagina);
}

export async function atualizarCategoria(
  id: string,
  dados: AtualizarCategoria,
): Promise<Categoria> {
  try {
    return await prisma.categoria.update({ where: { id }, data: dados });
  } catch (erro) {
    if (registroNaoEncontrado(erro)) {
      throw new ErroNaoEncontrado('Categoria não encontrada.');
    }
    if (violouUnicidade(erro)) {
      throw new ErroConflito(NOME_DUPLICADO);
    }
    throw erro;
  }
}

export async function removerCategoria(id: string): Promise<void> {
  try {
    await prisma.categoria.delete({ where: { id } });
  } catch (erro) {
    if (registroNaoEncontrado(erro)) {
      throw new ErroNaoEncontrado('Categoria não encontrada.');
    }
    if (temVinculo(erro)) {
      throw new ErroConflito('Categoria tem equipamentos vinculados e não pode ser removida.');
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
