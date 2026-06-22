import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    // Os testes compartilham o mesmo banco; rodar arquivos em paralelo geraria
    // corrida no TRUNCATE entre eles.
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://locadora:locadora@localhost:5433/locadora_test?schema=public',
    },
  },
});
