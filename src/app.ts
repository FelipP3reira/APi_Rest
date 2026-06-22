import express, { type Express } from 'express';
import helmet from 'helmet';

import { categoriasRotas } from './modules/categorias/categorias.rotas.js';
import { middlewareErro, rotaNaoEncontrada } from './shared/http/middleware-erro.js';

export function criarApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/v1/categorias', categoriasRotas);

  app.use(rotaNaoEncontrada);
  app.use(middlewareErro);

  return app;
}
