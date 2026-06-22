import { Router } from 'express';

import { idParamSchema } from '../../shared/http/parametros.js';
import { apresentarCliente } from './clientes.mapeador.js';
import {
  atualizarClienteSchema,
  criarClienteSchema,
  listarClientesQuerySchema,
} from './clientes.schema.js';
import * as clientes from './clientes.service.js';

export const clientesRotas = Router();

clientesRotas.post('/', async (req, res) => {
  const dados = criarClienteSchema.parse(req.body);
  const criado = await clientes.criarCliente(dados);
  res.status(201).json(apresentarCliente(criado));
});

clientesRotas.get('/', async (req, res) => {
  const query = listarClientesQuerySchema.parse(req.query);
  const pagina = await clientes.listarClientes(query);
  res.json({ dados: pagina.dados.map(apresentarCliente), meta: pagina.meta });
});

clientesRotas.get('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const cliente = await clientes.buscarCliente(id);
  res.json(apresentarCliente(cliente));
});

clientesRotas.patch('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const dados = atualizarClienteSchema.parse(req.body);
  const atualizado = await clientes.atualizarCliente(id, dados);
  res.json(apresentarCliente(atualizado));
});

clientesRotas.delete('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  await clientes.removerCliente(id);
  res.status(204).send();
});
