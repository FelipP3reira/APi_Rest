import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { criarApp } from '../src/app.js';
import { prisma } from '../src/shared/prisma/cliente.js';

const app = criarApp();

const PERIODO = { inicioEm: '2026-07-01', fimEm: '2026-07-05' };

async function criarLocacao(): Promise<string> {
  const categoria = await prisma.categoria.create({ data: { nome: `Categoria ${randomUUID()}` } });
  const equipamento = await prisma.equipamento.create({
    data: { categoriaId: categoria.id, nome: 'Gerador', valorDiariaCentavos: 15000 },
  });
  await prisma.unidadeEquipamento.create({
    data: { equipamentoId: equipamento.id, patrimonio: `PAT-${randomUUID()}` },
  });
  const cliente = await prisma.cliente.create({
    data: {
      nome: 'Construtora Alfa',
      documento: String(Math.floor(Math.random() * 1e11)).padStart(11, '0'),
      email: 'contato@alfa.com',
    },
  });

  const resposta = await request(app)
    .post('/v1/locacoes')
    .send({ clienteId: cliente.id, equipamentoId: equipamento.id, ...PERIODO });
  return resposta.body.id as string;
}

describe('transições de locação', () => {
  it('segue o fluxo reserva → retirada → devolução', async () => {
    const id = await criarLocacao();

    const retirada = await request(app).post(`/v1/locacoes/${id}/retirada`);
    expect(retirada.status).toBe(200);
    expect(retirada.body.status).toBe('RETIRADA');
    expect(retirada.body.retiradaEm).not.toBeNull();

    const devolucao = await request(app).post(`/v1/locacoes/${id}/devolucao`);
    expect(devolucao.status).toBe(200);
    expect(devolucao.body.status).toBe('DEVOLVIDA');
    expect(devolucao.body.devolvidaEm).not.toBeNull();
  });

  it('não devolve uma locação que não foi retirada (409)', async () => {
    const id = await criarLocacao();

    const resposta = await request(app).post(`/v1/locacoes/${id}/devolucao`);

    expect(resposta.status).toBe(409);
    expect(resposta.body.erro.codigo).toBe('CONFLITO');
  });

  it('não cancela uma locação já retirada (409)', async () => {
    const id = await criarLocacao();
    await request(app).post(`/v1/locacoes/${id}/retirada`);

    const resposta = await request(app).post(`/v1/locacoes/${id}/cancelamento`);

    expect(resposta.status).toBe(409);
  });

  it('não retira duas vezes (409 na segunda)', async () => {
    const id = await criarLocacao();

    const primeira = await request(app).post(`/v1/locacoes/${id}/retirada`);
    expect(primeira.status).toBe(200);

    const segunda = await request(app).post(`/v1/locacoes/${id}/retirada`);
    expect(segunda.status).toBe(409);
  });

  it('libera a unidade ao cancelar, permitindo nova reserva no mesmo período', async () => {
    const categoria = await prisma.categoria.create({
      data: { nome: `Categoria ${randomUUID()}` },
    });
    const equipamento = await prisma.equipamento.create({
      data: { categoriaId: categoria.id, nome: 'Gerador', valorDiariaCentavos: 15000 },
    });
    await prisma.unidadeEquipamento.create({
      data: { equipamentoId: equipamento.id, patrimonio: `PAT-${randomUUID()}` },
    });
    const cliente = await prisma.cliente.create({
      data: {
        nome: 'Construtora Alfa',
        documento: String(Math.floor(Math.random() * 1e11)).padStart(11, '0'),
        email: 'contato@alfa.com',
      },
    });
    const payload = { clienteId: cliente.id, equipamentoId: equipamento.id, ...PERIODO };

    const primeira = await request(app).post('/v1/locacoes').send(payload);
    await request(app).post(`/v1/locacoes/${primeira.body.id as string}/cancelamento`);

    const segunda = await request(app).post('/v1/locacoes').send(payload);
    expect(segunda.status).toBe(201);
  });

  it('devolve 404 ao transicionar locação inexistente', async () => {
    const resposta = await request(app).post(
      '/v1/locacoes/11111111-1111-1111-1111-111111111111/retirada',
    );

    expect(resposta.status).toBe(404);
    expect(resposta.body.erro.codigo).toBe('NAO_ENCONTRADO');
  });
});
