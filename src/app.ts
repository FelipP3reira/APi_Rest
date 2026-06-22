import express, { type Express } from 'express';
import helmet from 'helmet';

export function criarApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}
