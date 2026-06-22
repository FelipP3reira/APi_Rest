import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { criarApp } from '../src/app.js';

const app = criarApp();

describe('categorias', () => {
  it('cria uma categoria e devolve 201 com o id gerado', async () => {
    const resposta = await request(app).post('/v1/categorias').send({ nome: 'Geradores' });

    expect(resposta.status).toBe(201);
    expect(resposta.body).toMatchObject({ nome: 'Geradores' });
    expect(resposta.body.id).toBeTypeOf('string');
  });

  it('recusa nome curto com 400 e aponta o campo inválido', async () => {
    const resposta = await request(app).post('/v1/categorias').send({ nome: 'a' });

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro.codigo).toBe('VALIDACAO');
    expect(resposta.body.erro.detalhes.nome).toBeDefined();
  });

  it('recusa nome duplicado com 409', async () => {
    await request(app).post('/v1/categorias').send({ nome: 'Andaimes' });
    const resposta = await request(app).post('/v1/categorias').send({ nome: 'Andaimes' });

    expect(resposta.status).toBe(409);
    expect(resposta.body.erro.codigo).toBe('CONFLITO');
  });

  it('devolve 404 ao buscar um id que não existe', async () => {
    const resposta = await request(app).get('/v1/categorias/11111111-1111-1111-1111-111111111111');

    expect(resposta.status).toBe(404);
    expect(resposta.body.erro.codigo).toBe('NAO_ENCONTRADO');
  });

  it('lista filtrando por nome e devolve a meta de paginação', async () => {
    await request(app).post('/v1/categorias').send({ nome: 'Geradores' });
    await request(app).post('/v1/categorias').send({ nome: 'Andaimes' });

    const resposta = await request(app).get('/v1/categorias?nome=gera&pagina=1&porPagina=10');

    expect(resposta.status).toBe(200);
    expect(resposta.body.meta).toMatchObject({
      total: 1,
      pagina: 1,
      porPagina: 10,
      totalPaginas: 1,
    });
    expect(resposta.body.dados).toHaveLength(1);
    expect(resposta.body.dados[0].nome).toBe('Geradores');
  });
});
