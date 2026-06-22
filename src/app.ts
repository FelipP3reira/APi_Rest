import express, { type Express } from 'express';
import helmet from 'helmet';

import { categoriasRotas } from './modules/categorias/categorias.rotas.js';
import { clientesRotas } from './modules/clientes/clientes.rotas.js';
import { equipamentosRotas } from './modules/equipamentos/equipamentos.rotas.js';
import { locacoesRotas } from './modules/locacoes/locacoes.rotas.js';
import { unidadesRotas } from './modules/unidades/unidades.rotas.js';
import { middlewareErro, rotaNaoEncontrada } from './shared/http/middleware-erro.js';

export function criarApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/v1/categorias', categoriasRotas);
  app.use('/v1/equipamentos', equipamentosRotas);
  app.use('/v1/unidades', unidadesRotas);
  app.use('/v1/clientes', clientesRotas);
  app.use('/v1/locacoes', locacoesRotas);

  app.use(rotaNaoEncontrada);
  app.use(middlewareErro);

  return app;
}
