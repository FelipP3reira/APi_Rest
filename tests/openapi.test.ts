import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { criarApp } from '../src/app.js';

const app = criarApp();

describe('documentação OpenAPI', () => {
  it('expõe o documento em /docs.json com os caminhos principais', async () => {
    const resposta = await request(app).get('/docs.json');

    expect(resposta.status).toBe(200);
    expect(resposta.body.openapi).toBe('3.0.3');
    expect(resposta.body.paths['/v1/locacoes']).toBeDefined();
    expect(resposta.body.paths['/v1/equipamentos/{id}/disponibilidade']).toBeDefined();
    expect(resposta.body.components.schemas.Locacao).toBeDefined();
  });

  it('serve a página do Swagger UI em /docs/', async () => {
    const resposta = await request(app).get('/docs/');

    expect(resposta.status).toBe(200);
    expect(resposta.text).toContain('swagger-ui');
  });
});
