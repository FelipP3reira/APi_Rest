import { execSync } from 'node:child_process';

import { afterAll, beforeAll, beforeEach } from 'vitest';

import { prisma } from '../src/shared/prisma/cliente.js';

const TABELAS = ['locacoes', 'clientes', 'unidades_equipamento', 'equipamentos', 'categorias'];

beforeAll(() => {
  execSync('npx prisma migrate deploy', { stdio: 'ignore' });
});

beforeEach(async () => {
  const alvos = TABELAS.map((tabela) => `"${tabela}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${alvos} RESTART IDENTITY CASCADE;`);
});

afterAll(async () => {
  await prisma.$disconnect();
});
