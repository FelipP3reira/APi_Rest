import { z } from 'zod';

export const paginacaoQuerySchema = z.object({
  pagina: z.coerce.number().int().positive().default(1),
  porPagina: z.coerce.number().int().positive().max(100).default(20),
});

export interface PaginaResultado<T> {
  dados: T[];
  meta: {
    total: number;
    pagina: number;
    porPagina: number;
    totalPaginas: number;
  };
}

export function calcularSkip(pagina: number, porPagina: number): number {
  return (pagina - 1) * porPagina;
}

export function montarPagina<T>(
  dados: T[],
  total: number,
  pagina: number,
  porPagina: number,
): PaginaResultado<T> {
  return {
    dados,
    meta: {
      total,
      pagina,
      porPagina,
      totalPaginas: Math.ceil(total / porPagina),
    },
  };
}
