import { Router } from 'express';

import { idParamSchema } from '../../shared/http/parametros.js';
import { apresentarLocacao } from './locacoes.mapeador.js';
import { criarLocacaoSchema, listarLocacoesQuerySchema } from './locacoes.schema.js';
import * as locacoes from './locacoes.service.js';

export const locacoesRotas = Router();

locacoesRotas.post('/', async (req, res) => {
  const dados = criarLocacaoSchema.parse(req.body);
  const criada = await locacoes.criarLocacao(dados);
  res.status(201).json(apresentarLocacao(criada));
});

locacoesRotas.get('/', async (req, res) => {
  const query = listarLocacoesQuerySchema.parse(req.query);
  const pagina = await locacoes.listarLocacoes(query);
  res.json({ dados: pagina.dados.map(apresentarLocacao), meta: pagina.meta });
});

locacoesRotas.get('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const locacao = await locacoes.buscarLocacao(id);
  res.json(apresentarLocacao(locacao));
});

locacoesRotas.post('/:id/retirada', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const locacao = await locacoes.registrarRetirada(id);
  res.json(apresentarLocacao(locacao));
});

locacoesRotas.post('/:id/devolucao', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const locacao = await locacoes.registrarDevolucao(id);
  res.json(apresentarLocacao(locacao));
});

locacoesRotas.post('/:id/cancelamento', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const locacao = await locacoes.cancelarLocacao(id);
  res.json(apresentarLocacao(locacao));
});
