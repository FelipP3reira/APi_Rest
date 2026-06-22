import { Router } from 'express';

import { idParamSchema } from '../../shared/http/parametros.js';
import { unidadesDoEquipamentoRotas } from '../unidades/unidades.rotas.js';
import { apresentarDisponibilidade, apresentarEquipamento } from './equipamentos.mapeador.js';
import {
  atualizarEquipamentoSchema,
  criarEquipamentoSchema,
  disponibilidadeQuerySchema,
  listarEquipamentosQuerySchema,
} from './equipamentos.schema.js';
import * as equipamentos from './equipamentos.service.js';

export const equipamentosRotas = Router();

equipamentosRotas.use('/:equipamentoId/unidades', unidadesDoEquipamentoRotas);

equipamentosRotas.post('/', async (req, res) => {
  const dados = criarEquipamentoSchema.parse(req.body);
  const criado = await equipamentos.criarEquipamento(dados);
  res.status(201).json(apresentarEquipamento(criado));
});

equipamentosRotas.get('/', async (req, res) => {
  const query = listarEquipamentosQuerySchema.parse(req.query);
  const pagina = await equipamentos.listarEquipamentos(query);
  res.json({ dados: pagina.dados.map(apresentarEquipamento), meta: pagina.meta });
});

equipamentosRotas.get('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const equipamento = await equipamentos.buscarEquipamento(id);
  res.json(apresentarEquipamento(equipamento));
});

equipamentosRotas.get('/:id/disponibilidade', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const { de, ate } = disponibilidadeQuerySchema.parse(req.query);
  const unidadesLivres = await equipamentos.consultarDisponibilidade(id, de, ate);
  res.json(apresentarDisponibilidade(id, de, ate, unidadesLivres));
});

equipamentosRotas.patch('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const dados = atualizarEquipamentoSchema.parse(req.body);
  const atualizado = await equipamentos.atualizarEquipamento(id, dados);
  res.json(apresentarEquipamento(atualizado));
});

equipamentosRotas.delete('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  await equipamentos.removerEquipamento(id);
  res.status(204).send();
});
