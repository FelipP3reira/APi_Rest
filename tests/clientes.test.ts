import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { criarApp } from '../src/app.js';

const app = criarApp();

describe('clientes', () => {
  it('cria cliente normalizando documento e e-mail', async () => {
    const resposta = await request(app)
      .post('/v1/clientes')
      .send({ nome: 'Obra X', documento: '123.456.780-99', email: 'OBRA@X.COM' });

    expect(resposta.status).toBe(201);
    expect(resposta.body).toMatchObject({
      nome: 'Obra X',
      documento: '12345678099',
      email: 'obra@x.com',
    });
  });

  it('recusa e-mail inválido com 400', async () => {
    const resposta = await request(app)
      .post('/v1/clientes')
      .send({ nome: 'Fulano', documento: '12345678099', email: 'não-é-email' });

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro.detalhes.email).toBeDefined();
  });

  it('recusa documento sem o tamanho de CPF/CNPJ com 400', async () => {
    const resposta = await request(app)
      .post('/v1/clientes')
      .send({ nome: 'Fulano', documento: '123', email: 'f@x.com' });

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro.detalhes.documento).toBeDefined();
  });

  it('recusa documento duplicado com 409', async () => {
    await request(app)
      .post('/v1/clientes')
      .send({ nome: 'Primeiro', documento: '12345678000199', email: 'a@x.com' });
    const resposta = await request(app)
      .post('/v1/clientes')
      .send({ nome: 'Segundo', documento: '12.345.678/0001-99', email: 'b@x.com' });

    expect(resposta.status).toBe(409);
    expect(resposta.body.erro.codigo).toBe('CONFLITO');
  });

  it('devolve 404 ao buscar id inexistente', async () => {
    const resposta = await request(app).get('/v1/clientes/11111111-1111-1111-1111-111111111111');

    expect(resposta.status).toBe(404);
    expect(resposta.body.erro.codigo).toBe('NAO_ENCONTRADO');
  });
});
