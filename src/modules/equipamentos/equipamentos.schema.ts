import { z } from 'zod';

import { paginacaoQuerySchema } from '../../shared/http/paginacao.js';

export const criarEquipamentoSchema = z.object({
  categoriaId: z.string().uuid('Categoria inválida.'),
  nome: z.string().trim().min(2, 'Informe ao menos 2 caracteres.').max(120),
  descricao: z.string().trim().max(1000).optional(),
  valorDiariaCentavos: z.number().int().positive('A diária precisa ser maior que zero.'),
  caucaoCentavos: z.number().int().nonnegative().default(0),
  ativo: z.boolean().default(true),
});

export const atualizarEquipamentoSchema = criarEquipamentoSchema
  .partial()
  .refine((campos) => Object.keys(campos).length > 0, {
    message: 'Informe ao menos um campo para atualizar.',
  });

const booleanoQuery = z.enum(['true', 'false']).transform((valor) => valor === 'true');

export const listarEquipamentosQuerySchema = paginacaoQuerySchema
  .extend({
    categoriaId: z.string().uuid().optional(),
    precoMin: z.coerce.number().int().nonnegative().optional(),
    precoMax: z.coerce.number().int().nonnegative().optional(),
    ativo: booleanoQuery.optional(),
    disponivelDe: z.coerce.date().optional(),
    disponivelAte: z.coerce.date().optional(),
    ordenarPor: z.enum(['nome', 'valorDiariaCentavos', 'criadoEm']).default('nome'),
    ordem: z.enum(['asc', 'desc']).default('asc'),
  })
  .refine((q) => q.precoMin === undefined || q.precoMax === undefined || q.precoMin <= q.precoMax, {
    message: 'precoMin não pode ser maior que precoMax.',
    path: ['precoMin'],
  })
  .refine((q) => (q.disponivelDe === undefined) === (q.disponivelAte === undefined), {
    message: 'Informe disponivelDe e disponivelAte juntos.',
    path: ['disponivelDe'],
  })
  .refine(
    (q) =>
      q.disponivelDe === undefined ||
      q.disponivelAte === undefined ||
      q.disponivelDe <= q.disponivelAte,
    { message: 'disponivelDe não pode ser depois de disponivelAte.', path: ['disponivelDe'] },
  );

export const disponibilidadeQuerySchema = z
  .object({
    de: z.coerce.date(),
    ate: z.coerce.date(),
  })
  .refine((q) => q.de <= q.ate, {
    message: 'de não pode ser depois de ate.',
    path: ['de'],
  });

export type CriarEquipamento = z.infer<typeof criarEquipamentoSchema>;
export type AtualizarEquipamento = z.infer<typeof atualizarEquipamentoSchema>;
export type ListarEquipamentosQuery = z.infer<typeof listarEquipamentosQuerySchema>;
export type DisponibilidadeQuery = z.infer<typeof disponibilidadeQuerySchema>;
