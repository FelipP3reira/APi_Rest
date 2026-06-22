import { z } from 'zod';

import { paginacaoQuerySchema } from '../../shared/http/paginacao.js';

export const criarCategoriaSchema = z.object({
  nome: z.string().trim().min(2, 'Informe ao menos 2 caracteres.').max(80),
  descricao: z.string().trim().max(500).optional(),
});

export const atualizarCategoriaSchema = criarCategoriaSchema
  .partial()
  .refine((campos) => Object.keys(campos).length > 0, {
    message: 'Informe ao menos um campo para atualizar.',
  });

export const listarCategoriasQuerySchema = paginacaoQuerySchema.extend({
  nome: z.string().trim().optional(),
  ordenarPor: z.enum(['nome', 'criadoEm']).default('nome'),
  ordem: z.enum(['asc', 'desc']).default('asc'),
});

export type CriarCategoria = z.infer<typeof criarCategoriaSchema>;
export type AtualizarCategoria = z.infer<typeof atualizarCategoriaSchema>;
export type ListarCategoriasQuery = z.infer<typeof listarCategoriasQuerySchema>;
