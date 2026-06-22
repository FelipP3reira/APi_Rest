import { z } from 'zod';

import { paginacaoQuerySchema } from '../../shared/http/paginacao.js';

const documento = z
  .string()
  .trim()
  .transform((valor) => valor.replace(/\D/g, ''))
  .refine((digitos) => digitos.length === 11 || digitos.length === 14, {
    message: 'Documento deve ter 11 dígitos (CPF) ou 14 (CNPJ).',
  });

export const criarClienteSchema = z.object({
  nome: z.string().trim().min(2, 'Informe ao menos 2 caracteres.').max(120),
  documento,
  email: z.string().trim().toLowerCase().email('E-mail inválido.'),
  telefone: z.string().trim().min(8).max(20).optional(),
});

export const atualizarClienteSchema = criarClienteSchema
  .partial()
  .refine((campos) => Object.keys(campos).length > 0, {
    message: 'Informe ao menos um campo para atualizar.',
  });

export const listarClientesQuerySchema = paginacaoQuerySchema.extend({
  nome: z.string().trim().optional(),
  documento: z.string().trim().optional(),
  ordenarPor: z.enum(['nome', 'criadoEm']).default('nome'),
  ordem: z.enum(['asc', 'desc']).default('asc'),
});

export type CriarCliente = z.infer<typeof criarClienteSchema>;
export type AtualizarCliente = z.infer<typeof atualizarClienteSchema>;
export type ListarClientesQuery = z.infer<typeof listarClientesQuerySchema>;
