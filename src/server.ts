import { criarApp } from './app.js';
import { config } from './config/env.js';

const app = criarApp();

app.listen(config.PORT, () => {
  console.info(`API no ar em http://localhost:${config.PORT}`);
});
