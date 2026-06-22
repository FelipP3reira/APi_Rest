import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from '@asteasolutions/zod-to-openapi';
import type { OpenAPIObject } from 'openapi3-ts/oas30';
import { z } from 'zod';

import { criarCategoriaSchema } from '../../modules/categorias/categorias.schema.js';
import { criarEquipamentoSchema } from '../../modules/equipamentos/equipamentos.schema.js';
import { criarUnidadeSchema } from '../../modules/unidades/unidades.schema.js';

// Estende o zod com .openapi() e passa a ler os schemas de validação já
// existentes — a documentação nasce das mesmas definições, não de um arquivo
// paralelo que envelhece sozinho.
extendZodWithOpenApi(z);

const registro = new OpenAPIRegistry();

const erroSchema = registro.register(
  'Erro',
  z.object({
    erro: z.object({
      codigo: z.string(),
      mensagem: z.string(),
      detalhes: z.unknown().optional(),
    }),
  }),
);

const metaSchema = registro.register(
  'MetaPaginacao',
  z.object({
    total: z.number().int(),
    pagina: z.number().int(),
    porPagina: z.number().int(),
    totalPaginas: z.number().int(),
  }),
);

const categoriaSchema = registro.register(
  'Categoria',
  z.object({
    id: z.string().uuid(),
    nome: z.string(),
    descricao: z.string().nullable(),
    criadoEm: z.string().datetime(),
    atualizadoEm: z.string().datetime(),
  }),
);

const equipamentoSchema = registro.register(
  'Equipamento',
  z.object({
    id: z.string().uuid(),
    categoriaId: z.string().uuid(),
    nome: z.string(),
    descricao: z.string().nullable(),
    valorDiariaCentavos: z.number().int(),
    caucaoCentavos: z.number().int(),
    ativo: z.boolean(),
    criadoEm: z.string().datetime(),
    atualizadoEm: z.string().datetime(),
  }),
);

const unidadeSchema = registro.register(
  'Unidade',
  z.object({
    id: z.string().uuid(),
    equipamentoId: z.string().uuid(),
    patrimonio: z.string(),
    status: z.enum(['DISPONIVEL', 'MANUTENCAO', 'INATIVA']),
    criadoEm: z.string().datetime(),
  }),
);

const clienteSchema = registro.register(
  'Cliente',
  z.object({
    id: z.string().uuid(),
    nome: z.string(),
    documento: z.string(),
    email: z.string(),
    telefone: z.string().nullable(),
    criadoEm: z.string().datetime(),
  }),
);

const locacaoSchema = registro.register(
  'Locacao',
  z.object({
    id: z.string().uuid(),
    clienteId: z.string().uuid(),
    equipamentoId: z.string().uuid(),
    unidadeId: z.string().uuid(),
    patrimonio: z.string(),
    inicioEm: z.string(),
    fimEm: z.string(),
    status: z.enum(['RESERVADA', 'RETIRADA', 'DEVOLVIDA', 'CANCELADA']),
    valorTotalCentavos: z.number().int(),
    retiradaEm: z.string().nullable(),
    devolvidaEm: z.string().nullable(),
    criadoEm: z.string().datetime(),
  }),
);

const disponibilidadeSchema = registro.register(
  'Disponibilidade',
  z.object({
    equipamentoId: z.string().uuid(),
    periodo: z.object({ de: z.string(), ate: z.string() }),
    unidadesDisponiveis: z.number().int(),
    unidades: z.array(z.object({ id: z.string().uuid(), patrimonio: z.string() })),
  }),
);

const criarClienteBody = z.object({
  nome: z.string().min(2),
  documento: z.string().openapi({ example: '123.456.780-99' }),
  email: z.string().email(),
  telefone: z.string().optional(),
});

const criarLocacaoBody = z.object({
  clienteId: z.string().uuid(),
  equipamentoId: z.string().uuid(),
  inicioEm: z.string().openapi({ example: '2026-07-01' }),
  fimEm: z.string().openapi({ example: '2026-07-05' }),
});

const idParam = z.object({ id: z.string().uuid() });

function listaDe(item: z.ZodTypeAny): z.ZodTypeAny {
  return z.object({ dados: z.array(item), meta: metaSchema });
}

function json(description: string, schema: z.ZodTypeAny) {
  return { description, content: { 'application/json': { schema } } };
}

function corpo(schema: z.ZodTypeAny) {
  return { content: { 'application/json': { schema } } };
}

function erro(description: string) {
  return json(description, erroSchema);
}

registro.registerPath({
  method: 'get',
  path: '/v1/categorias',
  tags: ['Categorias'],
  summary: 'Lista categorias com paginação, filtro e ordenação',
  request: {
    query: z.object({
      pagina: z.number().int().optional(),
      porPagina: z.number().int().optional(),
      nome: z.string().optional(),
      ordenarPor: z.enum(['nome', 'criadoEm']).optional(),
      ordem: z.enum(['asc', 'desc']).optional(),
    }),
  },
  responses: { 200: json('Página de categorias', listaDe(categoriaSchema)) },
});

registro.registerPath({
  method: 'post',
  path: '/v1/categorias',
  tags: ['Categorias'],
  summary: 'Cria uma categoria',
  request: { body: corpo(criarCategoriaSchema) },
  responses: {
    201: json('Categoria criada', categoriaSchema),
    400: erro('Dados inválidos'),
    409: erro('Nome já existe'),
  },
});

registro.registerPath({
  method: 'get',
  path: '/v1/categorias/{id}',
  tags: ['Categorias'],
  summary: 'Busca uma categoria',
  request: { params: idParam },
  responses: { 200: json('Categoria', categoriaSchema), 404: erro('Não encontrada') },
});

registro.registerPath({
  method: 'patch',
  path: '/v1/categorias/{id}',
  tags: ['Categorias'],
  summary: 'Atualiza uma categoria',
  request: { params: idParam, body: corpo(criarCategoriaSchema.partial()) },
  responses: {
    200: json('Categoria atualizada', categoriaSchema),
    400: erro('Dados inválidos'),
    404: erro('Não encontrada'),
    409: erro('Nome já existe'),
  },
});

registro.registerPath({
  method: 'delete',
  path: '/v1/categorias/{id}',
  tags: ['Categorias'],
  summary: 'Remove uma categoria',
  request: { params: idParam },
  responses: {
    204: { description: 'Removida' },
    404: erro('Não encontrada'),
    409: erro('Tem equipamentos vinculados'),
  },
});

registro.registerPath({
  method: 'get',
  path: '/v1/equipamentos',
  tags: ['Equipamentos'],
  summary: 'Lista equipamentos com filtros de categoria, preço e disponibilidade',
  request: {
    query: z.object({
      pagina: z.number().int().optional(),
      porPagina: z.number().int().optional(),
      categoriaId: z.string().uuid().optional(),
      precoMin: z.number().int().optional(),
      precoMax: z.number().int().optional(),
      ativo: z.boolean().optional(),
      disponivelDe: z.string().optional(),
      disponivelAte: z.string().optional(),
      ordenarPor: z.enum(['nome', 'valorDiariaCentavos', 'criadoEm']).optional(),
      ordem: z.enum(['asc', 'desc']).optional(),
    }),
  },
  responses: { 200: json('Página de equipamentos', listaDe(equipamentoSchema)) },
});

registro.registerPath({
  method: 'post',
  path: '/v1/equipamentos',
  tags: ['Equipamentos'],
  summary: 'Cria um equipamento',
  request: { body: corpo(criarEquipamentoSchema) },
  responses: {
    201: json('Equipamento criado', equipamentoSchema),
    400: erro('Dados inválidos ou categoria inexistente'),
  },
});

registro.registerPath({
  method: 'get',
  path: '/v1/equipamentos/{id}',
  tags: ['Equipamentos'],
  summary: 'Busca um equipamento',
  request: { params: idParam },
  responses: { 200: json('Equipamento', equipamentoSchema), 404: erro('Não encontrado') },
});

registro.registerPath({
  method: 'get',
  path: '/v1/equipamentos/{id}/disponibilidade',
  tags: ['Equipamentos'],
  summary: 'Unidades livres do equipamento em um período',
  request: {
    params: idParam,
    query: z.object({
      de: z.string().openapi({ example: '2026-07-01' }),
      ate: z.string().openapi({ example: '2026-07-05' }),
    }),
  },
  responses: {
    200: json('Disponibilidade no período', disponibilidadeSchema),
    400: erro('Período inválido'),
    404: erro('Equipamento não encontrado'),
  },
});

registro.registerPath({
  method: 'get',
  path: '/v1/equipamentos/{equipamentoId}/unidades',
  tags: ['Unidades'],
  summary: 'Lista as unidades de um equipamento',
  request: { params: z.object({ equipamentoId: z.string().uuid() }) },
  responses: {
    200: json('Unidades do equipamento', z.object({ dados: z.array(unidadeSchema) })),
    404: erro('Equipamento não encontrado'),
  },
});

registro.registerPath({
  method: 'post',
  path: '/v1/equipamentos/{equipamentoId}/unidades',
  tags: ['Unidades'],
  summary: 'Cadastra uma unidade no equipamento',
  request: {
    params: z.object({ equipamentoId: z.string().uuid() }),
    body: corpo(criarUnidadeSchema),
  },
  responses: {
    201: json('Unidade criada', unidadeSchema),
    400: erro('Dados inválidos ou equipamento inexistente'),
    409: erro('Patrimônio já existe'),
  },
});

registro.registerPath({
  method: 'get',
  path: '/v1/clientes',
  tags: ['Clientes'],
  summary: 'Lista clientes',
  request: {
    query: z.object({
      pagina: z.number().int().optional(),
      porPagina: z.number().int().optional(),
      nome: z.string().optional(),
      documento: z.string().optional(),
      ordenarPor: z.enum(['nome', 'criadoEm']).optional(),
      ordem: z.enum(['asc', 'desc']).optional(),
    }),
  },
  responses: { 200: json('Página de clientes', listaDe(clienteSchema)) },
});

registro.registerPath({
  method: 'post',
  path: '/v1/clientes',
  tags: ['Clientes'],
  summary: 'Cria um cliente',
  request: { body: corpo(criarClienteBody) },
  responses: {
    201: json('Cliente criado', clienteSchema),
    400: erro('Dados inválidos'),
    409: erro('Documento já cadastrado'),
  },
});

registro.registerPath({
  method: 'get',
  path: '/v1/clientes/{id}',
  tags: ['Clientes'],
  summary: 'Busca um cliente',
  request: { params: idParam },
  responses: { 200: json('Cliente', clienteSchema), 404: erro('Não encontrado') },
});

registro.registerPath({
  method: 'get',
  path: '/v1/locacoes',
  tags: ['Locações'],
  summary: 'Lista locações com filtros de status, cliente, equipamento e período',
  request: {
    query: z.object({
      pagina: z.number().int().optional(),
      porPagina: z.number().int().optional(),
      status: z.enum(['RESERVADA', 'RETIRADA', 'DEVOLVIDA', 'CANCELADA']).optional(),
      clienteId: z.string().uuid().optional(),
      equipamentoId: z.string().uuid().optional(),
      de: z.string().optional(),
      ate: z.string().optional(),
      ordenarPor: z.enum(['inicioEm', 'criadoEm']).optional(),
      ordem: z.enum(['asc', 'desc']).optional(),
    }),
  },
  responses: { 200: json('Página de locações', listaDe(locacaoSchema)) },
});

registro.registerPath({
  method: 'post',
  path: '/v1/locacoes',
  tags: ['Locações'],
  summary: 'Cria uma locação alocando uma unidade livre no período',
  request: { body: corpo(criarLocacaoBody) },
  responses: {
    201: json('Locação criada', locacaoSchema),
    400: erro('Período inválido'),
    404: erro('Cliente ou equipamento não encontrado'),
    409: erro('Sem unidade disponível no período'),
  },
});

registro.registerPath({
  method: 'get',
  path: '/v1/locacoes/{id}',
  tags: ['Locações'],
  summary: 'Busca uma locação',
  request: { params: idParam },
  responses: { 200: json('Locação', locacaoSchema), 404: erro('Não encontrada') },
});

for (const acao of ['retirada', 'devolucao', 'cancelamento'] as const) {
  registro.registerPath({
    method: 'post',
    path: `/v1/locacoes/{id}/${acao}`,
    tags: ['Locações'],
    summary: `Registra ${acao} da locação`,
    request: { params: idParam },
    responses: {
      200: json('Locação atualizada', locacaoSchema),
      404: erro('Não encontrada'),
      409: erro('Transição não permitida no estado atual'),
    },
  });
}

export function gerarDocumentoOpenApi(): OpenAPIObject {
  const gerador = new OpenApiGeneratorV3(registro.definitions);
  return gerador.generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'API da Locadora de Equipamentos',
      version: '1.0.0',
      description:
        'Catálogo e locação de equipamentos com controle de disponibilidade por período.',
    },
    servers: [{ url: '/' }],
  });
}
