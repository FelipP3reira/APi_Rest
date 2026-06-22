import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';

import { montarCorpoErro } from './resposta-erro.js';

const aoEstourar: RequestHandler = (_req, res) => {
  res
    .status(429)
    .json(
      montarCorpoErro(
        'LIMITE_EXCEDIDO',
        'Muitas requisições em pouco tempo. Espera um pouco e tenta de novo.',
      ),
    );
};

// Teto geral por IP, folgado — protege contra abuso sem atrapalhar uso normal.
export const limitePadrao = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: aoEstourar,
});

// Teto apertado só para escrita (POST/PATCH/DELETE). Criar locação é o ponto
// mais sensível: é onde alguém poderia tentar segurar unidades em massa.
export const limiteEscrita = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: aoEstourar,
  skip: (req) => req.method === 'GET' || req.method === 'HEAD',
});
