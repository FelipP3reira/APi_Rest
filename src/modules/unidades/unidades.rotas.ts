import { Router } from 'express';
import { z } from 'zod';

import { idParamSchema } from '../../shared/http/parametros.js';
import { apresentarUnidade } from './unidades.mapeador.js';
import { atualizarUnidadeSchema, criarUnidadeSchema } from './unidades.schema.js';
import * as unidades from './unidades.service.js';

const equipamentoIdParamSchema = z.object({
  equipamentoId: z.string().uuid('Equipamento inválido.'),
});

// Montado sob /v1/equipamentos/:equipamentoId/unidades — precisa de mergeParams
// para enxergar o :equipamentoId do roteador pai.
export const unidadesDoEquipamentoRotas = Router({ mergeParams: true });

unidadesDoEquipamentoRotas.post('/', async (req, res) => {
  const { equipamentoId } = equipamentoIdParamSchema.parse(req.params);
  const dados = criarUnidadeSchema.parse(req.body);
  const criada = await unidades.criarUnidade(equipamentoId, dados);
  res.status(201).json(apresentarUnidade(criada));
});

unidadesDoEquipamentoRotas.get('/', async (req, res) => {
  const { equipamentoId } = equipamentoIdParamSchema.parse(req.params);
  const lista = await unidades.listarUnidadesDoEquipamento(equipamentoId);
  res.json({ dados: lista.map(apresentarUnidade) });
});

// Montado sob /v1/unidades.
export const unidadesRotas = Router();

unidadesRotas.patch('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const dados = atualizarUnidadeSchema.parse(req.body);
  const atualizada = await unidades.atualizarUnidade(id, dados);
  res.json(apresentarUnidade(atualizada));
});

unidadesRotas.delete('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  await unidades.removerUnidade(id);
  res.status(204).send();
});
