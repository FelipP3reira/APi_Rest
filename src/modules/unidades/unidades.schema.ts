import { StatusUnidade } from '@prisma/client';
import { z } from 'zod';

export const criarUnidadeSchema = z.object({
  patrimonio: z.string().trim().min(1, 'Informe o patrimônio.').max(60),
  status: z.nativeEnum(StatusUnidade).default(StatusUnidade.DISPONIVEL),
});

export const atualizarUnidadeSchema = z
  .object({
    patrimonio: z.string().trim().min(1).max(60).optional(),
    status: z.nativeEnum(StatusUnidade).optional(),
  })
  .refine((campos) => Object.keys(campos).length > 0, {
    message: 'Informe ao menos um campo para atualizar.',
  });

export type CriarUnidade = z.infer<typeof criarUnidadeSchema>;
export type AtualizarUnidade = z.infer<typeof atualizarUnidadeSchema>;
