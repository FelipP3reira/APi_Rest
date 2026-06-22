import { StatusLocacao } from '@prisma/client';
import { z } from 'zod';

import { paginacaoQuerySchema } from '../../shared/http/paginacao.js';

function apenasData(data: Date): string {
  return data.toISOString().slice(0, 10);
}

export const criarLocacaoSchema = z
  .object({
    clienteId: z.string().uuid('Cliente inválido.'),
    equipamentoId: z.string().uuid('Equipamento inválido.'),
    inicioEm: z.coerce.date(),
    fimEm: z.coerce.date(),
  })
  .refine((q) => apenasData(q.fimEm) >= apenasData(q.inicioEm), {
    message: 'A data de fim não pode ser antes do início.',
    path: ['fimEm'],
  })
  .refine((q) => apenasData(q.inicioEm) >= apenasData(new Date()), {
    message: 'A data de início não pode estar no passado.',
    path: ['inicioEm'],
  });

export const listarLocacoesQuerySchema = paginacaoQuerySchema
  .extend({
    status: z.nativeEnum(StatusLocacao).optional(),
    clienteId: z.string().uuid().optional(),
    equipamentoId: z.string().uuid().optional(),
    de: z.coerce.date().optional(),
    ate: z.coerce.date().optional(),
    ordenarPor: z.enum(['inicioEm', 'criadoEm']).default('inicioEm'),
    ordem: z.enum(['asc', 'desc']).default('desc'),
  })
  .refine((q) => (q.de === undefined) === (q.ate === undefined), {
    message: 'Informe de e ate juntos.',
    path: ['de'],
  })
  .refine((q) => q.de === undefined || q.ate === undefined || q.de <= q.ate, {
    message: 'de não pode ser depois de ate.',
    path: ['de'],
  });

export type CriarLocacao = z.infer<typeof criarLocacaoSchema>;
export type ListarLocacoesQuery = z.infer<typeof listarLocacoesQuerySchema>;
