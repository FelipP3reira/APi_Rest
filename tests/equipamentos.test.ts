import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { criarApp } from '../src/app.js';
import { prisma } from '../src/shared/prisma/cliente.js';

const app = criarApp();

async function criarCategoria(nome = 'Geradores'): Promise<string> {
  const resposta = await request(app).post('/v1/categorias').send({ nome });
  return resposta.body.id as string;
}

async function criarEquipamento(
  categoriaId: string,
  campos: Record<string, unknown> = {},
): Promise<string> {
  const resposta = await request(app)
    .post('/v1/equipamentos')
    .send({ categoriaId, nome: 'Gerador 5kVA', valorDiariaCentavos: 15000, ...campos });
  return resposta.body.id as string;
}

describe('equipamentos', () => {
  it('cria equipamento vinculado a uma categoria', async () => {
    const categoriaId = await criarCategoria();
    const resposta = await request(app)
      .post('/v1/equipamentos')
      .send({ categoriaId, nome: 'Gerador 5kVA', valorDiariaCentavos: 15000 });

    expect(resposta.status).toBe(201);
    expect(resposta.body).toMatchObject({
      nome: 'Gerador 5kVA',
      valorDiariaCentavos: 15000,
      caucaoCentavos: 0,
      ativo: true,
    });
  });

  it('recusa equipamento com categoria inexistente (400)', async () => {
    const resposta = await request(app).post('/v1/equipamentos').send({
      categoriaId: '11111111-1111-1111-1111-111111111111',
      nome: 'Sem categoria',
      valorDiariaCentavos: 1000,
    });

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro.codigo).toBe('VALIDACAO');
  });

  it('filtra por faixa de preço dentro da categoria', async () => {
    const categoriaId = await criarCategoria();
    await criarEquipamento(categoriaId, { nome: 'Barato', valorDiariaCentavos: 5000 });
    await criarEquipamento(categoriaId, { nome: 'Caro', valorDiariaCentavos: 50000 });

    const resposta = await request(app).get(
      `/v1/equipamentos?categoriaId=${categoriaId}&precoMin=10000&precoMax=60000`,
    );

    expect(resposta.status).toBe(200);
    expect(resposta.body.meta.total).toBe(1);
    expect(resposta.body.dados[0].nome).toBe('Caro');
  });

  it('devolve 404 ao buscar equipamento inexistente', async () => {
    const resposta = await request(app).get(
      '/v1/equipamentos/11111111-1111-1111-1111-111111111111',
    );

    expect(resposta.status).toBe(404);
    expect(resposta.body.erro.codigo).toBe('NAO_ENCONTRADO');
  });
});

describe('unidades', () => {
  it('cria unidade e recusa patrimônio duplicado (409)', async () => {
    const categoriaId = await criarCategoria();
    const equipamentoId = await criarEquipamento(categoriaId);

    const primeira = await request(app)
      .post(`/v1/equipamentos/${equipamentoId}/unidades`)
      .send({ patrimonio: 'PAT-1' });
    expect(primeira.status).toBe(201);

    const repetida = await request(app)
      .post(`/v1/equipamentos/${equipamentoId}/unidades`)
      .send({ patrimonio: 'PAT-1' });
    expect(repetida.status).toBe(409);
    expect(repetida.body.erro.codigo).toBe('CONFLITO');
  });
});

describe('disponibilidade por período', () => {
  it('tira do período a unidade já reservada e mantém as livres', async () => {
    const categoriaId = await criarCategoria();
    const equipamentoId = await criarEquipamento(categoriaId);

    const primeira = await request(app)
      .post(`/v1/equipamentos/${equipamentoId}/unidades`)
      .send({ patrimonio: 'PAT-1' });
    await request(app)
      .post(`/v1/equipamentos/${equipamentoId}/unidades`)
      .send({ patrimonio: 'PAT-2' });

    const cliente = await prisma.cliente.create({
      data: { nome: 'Obra X', documento: '12345678000199', email: 'obra@x.com' },
    });
    await prisma.locacao.create({
      data: {
        clienteId: cliente.id,
        unidadeId: primeira.body.id as string,
        inicioEm: new Date('2026-07-01'),
        fimEm: new Date('2026-07-05'),
        valorTotalCentavos: 60000,
      },
    });

    const dentroDoPeriodo = await request(app).get(
      `/v1/equipamentos/${equipamentoId}/disponibilidade?de=2026-07-03&ate=2026-07-04`,
    );
    expect(dentroDoPeriodo.status).toBe(200);
    expect(dentroDoPeriodo.body.unidadesDisponiveis).toBe(1);

    const foraDoPeriodo = await request(app).get(
      `/v1/equipamentos/${equipamentoId}/disponibilidade?de=2026-08-01&ate=2026-08-02`,
    );
    expect(foraDoPeriodo.body.unidadesDisponiveis).toBe(2);
  });
});
