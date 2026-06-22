import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { criarApp } from '../src/app.js';
import { prisma } from '../src/shared/prisma/cliente.js';

const app = criarApp();

interface Cenario {
  equipamentoId: string;
  clienteId: string;
}

async function montarCenario(
  quantidadeUnidades = 1,
  valorDiariaCentavos = 15000,
): Promise<Cenario> {
  const categoria = await prisma.categoria.create({ data: { nome: `Categoria ${randomUUID()}` } });
  const equipamento = await prisma.equipamento.create({
    data: { categoriaId: categoria.id, nome: 'Gerador 5kVA', valorDiariaCentavos },
  });
  for (let indice = 0; indice < quantidadeUnidades; indice += 1) {
    await prisma.unidadeEquipamento.create({
      data: { equipamentoId: equipamento.id, patrimonio: `PAT-${randomUUID()}` },
    });
  }
  const cliente = await prisma.cliente.create({
    data: {
      nome: 'Construtora Alfa',
      documento: String(Math.floor(Math.random() * 1e11)).padStart(11, '0'),
      email: 'contato@alfa.com',
    },
  });
  return { equipamentoId: equipamento.id, clienteId: cliente.id };
}

describe('criação de locação', () => {
  it('reserva uma unidade e calcula o valor pelas diárias', async () => {
    const { equipamentoId, clienteId } = await montarCenario(1, 15000);

    const resposta = await request(app)
      .post('/v1/locacoes')
      .send({ clienteId, equipamentoId, inicioEm: '2026-07-01', fimEm: '2026-07-05' });

    expect(resposta.status).toBe(201);
    // 5 dias (01 a 05, inclusivo) x R$ 150,00.
    expect(resposta.body.valorTotalCentavos).toBe(75000);
    expect(resposta.body.status).toBe('RESERVADA');
    expect(resposta.body.unidadeId).toBeTypeOf('string');
  });

  it('recusa período com fim antes do início (400)', async () => {
    const { equipamentoId, clienteId } = await montarCenario();

    const resposta = await request(app)
      .post('/v1/locacoes')
      .send({ clienteId, equipamentoId, inicioEm: '2026-07-05', fimEm: '2026-07-01' });

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro.detalhes.fimEm).toBeDefined();
  });

  it('recusa início no passado (400)', async () => {
    const { equipamentoId, clienteId } = await montarCenario();

    const resposta = await request(app)
      .post('/v1/locacoes')
      .send({ clienteId, equipamentoId, inicioEm: '2020-01-01', fimEm: '2020-01-02' });

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro.detalhes.inicioEm).toBeDefined();
  });

  it('recusa quando não há unidade livre no período (409)', async () => {
    const { equipamentoId, clienteId } = await montarCenario(1);
    const periodo = { clienteId, equipamentoId, inicioEm: '2026-07-01', fimEm: '2026-07-05' };

    const primeira = await request(app).post('/v1/locacoes').send(periodo);
    expect(primeira.status).toBe(201);

    const sobreposta = await request(app)
      .post('/v1/locacoes')
      .send({ ...periodo, inicioEm: '2026-07-03', fimEm: '2026-07-08' });

    expect(sobreposta.status).toBe(409);
    expect(sobreposta.body.erro.codigo).toBe('CONFLITO');
  });

  it('sob concorrência pela última unidade, só uma reserva vence', async () => {
    const { equipamentoId, clienteId } = await montarCenario(1);
    const payload = { clienteId, equipamentoId, inicioEm: '2026-07-01', fimEm: '2026-07-05' };

    const [primeira, segunda] = await Promise.all([
      request(app).post('/v1/locacoes').send(payload),
      request(app).post('/v1/locacoes').send(payload),
    ]);

    const statuses = [primeira.status, segunda.status].sort((a, b) => a - b);
    expect(statuses).toEqual([201, 409]);
  });
});

describe('consulta de locações', () => {
  it('filtra por cliente e status', async () => {
    const { equipamentoId, clienteId } = await montarCenario(2);
    await request(app)
      .post('/v1/locacoes')
      .send({ clienteId, equipamentoId, inicioEm: '2026-07-01', fimEm: '2026-07-05' });

    const resposta = await request(app).get(`/v1/locacoes?clienteId=${clienteId}&status=RESERVADA`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.meta.total).toBe(1);
    expect(resposta.body.dados[0].clienteId).toBe(clienteId);
  });

  it('devolve 404 ao buscar locação inexistente', async () => {
    const resposta = await request(app).get('/v1/locacoes/11111111-1111-1111-1111-111111111111');

    expect(resposta.status).toBe(404);
    expect(resposta.body.erro.codigo).toBe('NAO_ENCONTRADO');
  });
});
