import express, { type Express } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { limiteEscrita } from '../src/shared/http/rate-limit.js';

function appComLimite(): Express {
  const app = express();
  app.use(limiteEscrita);
  app.get('/recurso', (_req, res) => {
    res.json({ ok: true });
  });
  app.post('/recurso', (_req, res) => {
    res.status(201).json({ ok: true });
  });
  return app;
}

describe('rate limit de escrita', () => {
  it('não conta GET e bloqueia POST com 429 depois do teto', async () => {
    const app = appComLimite();

    for (let tentativa = 0; tentativa < 25; tentativa += 1) {
      const leitura = await request(app).get('/recurso');
      expect(leitura.status).toBe(200);
    }

    let respostaBloqueada: request.Response | undefined;
    for (let tentativa = 0; tentativa < 25 && !respostaBloqueada; tentativa += 1) {
      const escrita = await request(app).post('/recurso');
      if (escrita.status === 429) {
        respostaBloqueada = escrita;
      }
    }

    expect(respostaBloqueada).toBeDefined();
    expect(respostaBloqueada?.body.erro.codigo).toBe('LIMITE_EXCEDIDO');
  });
});
