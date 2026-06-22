import type { Categoria } from '@prisma/client';

export function apresentarCategoria(categoria: Categoria) {
  return {
    id: categoria.id,
    nome: categoria.nome,
    descricao: categoria.descricao,
    criadoEm: categoria.criadoEm,
    atualizadoEm: categoria.atualizadoEm,
  };
}
