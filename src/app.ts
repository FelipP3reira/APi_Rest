import express, { type Express } from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';

import { config } from './config/env.js';
import { categoriasRotas } from './modules/categorias/categorias.rotas.js';
import { clientesRotas } from './modules/clientes/clientes.rotas.js';
import { equipamentosRotas } from './modules/equipamentos/equipamentos.rotas.js';
import { locacoesRotas } from './modules/locacoes/locacoes.rotas.js';
import { unidadesRotas } from './modules/unidades/unidades.rotas.js';
import { middlewareErro, rotaNaoEncontrada } from './shared/http/middleware-erro.js';
import { limiteEscrita, limitePadrao } from './shared/http/rate-limit.js';
import { gerarDocumentoOpenApi } from './shared/openapi/documento.js';

export function criarApp(): Express {
  const app = express();

  // CSP padrão do helmet bloqueia o inline que o Swagger UI usa; liberamos só o
  // necessário para a página de /docs, mantendo o resto das proteções.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'script-src': ["'self'", "'unsafe-inline'"],
          'style-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:'],
        },
      },
    }),
  );
  app.use(express.json());

  // Nos testes o rate limit só atrapalharia (a suíte dispara muitas requisições
  // em sequência); em runtime ele protege as rotas, com teto extra na escrita.
  if (config.NODE_ENV !== 'test') {
    app.use(limitePadrao);
    app.use(limiteEscrita);
  }

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  const documentoOpenApi = gerarDocumentoOpenApi();
  app.get('/docs.json', (_req, res) => {
    res.json(documentoOpenApi);
  });
  app.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(documentoOpenApi, { customSiteTitle: 'API da Locadora — Docs' }),
  );

  app.use('/v1/categorias', categoriasRotas);
  app.use('/v1/equipamentos', equipamentosRotas);
  app.use('/v1/unidades', unidadesRotas);
  app.use('/v1/clientes', clientesRotas);
  app.use('/v1/locacoes', locacoesRotas);

  app.use(rotaNaoEncontrada);
  app.use(middlewareErro);

  return app;
}
