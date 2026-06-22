import { Router } from 'express';

import { idParamSchema } from '../../shared/http/parametros.js';
import { apresentarCategoria } from './categorias.mapeador.js';
import {
  atualizarCategoriaSchema,
  criarCategoriaSchema,
  listarCategoriasQuerySchema,
} from './categorias.schema.js';
import * as categorias from './categorias.service.js';

export const categoriasRotas = Router();

categoriasRotas.post('/', async (req, res) => {
  const dados = criarCategoriaSchema.parse(req.body);
  const criada = await categorias.criarCategoria(dados);
  res.status(201).json(apresentarCategoria(criada));
});

categoriasRotas.get('/', async (req, res) => {
  const query = listarCategoriasQuerySchema.parse(req.query);
  const pagina = await categorias.listarCategorias(query);
  res.json({ dados: pagina.dados.map(apresentarCategoria), meta: pagina.meta });
});

categoriasRotas.get('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const categoria = await categorias.buscarCategoria(id);
  res.json(apresentarCategoria(categoria));
});

categoriasRotas.patch('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const dados = atualizarCategoriaSchema.parse(req.body);
  const atualizada = await categorias.atualizarCategoria(id, dados);
  res.json(apresentarCategoria(atualizada));
});

categoriasRotas.delete('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  await categorias.removerCategoria(id);
  res.status(204).send();
});
