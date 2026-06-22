# Locadora de Equipamentos — API REST

API de uma locadora de equipamentos (geradores, andaimes, esse tipo de coisa). O foco
não é o CRUD: é a **disponibilidade por período**. Um equipamento é um modelo, e dele
existem várias unidades físicas; quando alguém aluga, o sistema aloca uma unidade livre
no intervalo pedido — e garante que ninguém reserve a mesma unidade duas vezes no mesmo
período, inclusive sob concorrência.

Fiz este projeto pra ter no portfólio uma API com regra de negócio de verdade, não um
gerador de tabela com `GET/POST`. O problema interessante aqui é alocação com janela de
tempo, e foi nele que coloquei o esforço.

## Stack

- **Node + TypeScript** (ESM, modo estrito)
- **Express 5** — tratamento de erro centralizado, validação na borda
- **Prisma 6 + PostgreSQL 16**
- **zod** para validação de entrada e como fonte do OpenAPI
- **Vitest + Supertest** para testes de integração
- **OpenAPI / Swagger UI** em `/docs`

## Domínio e regras

- **Categoria** → **Equipamento** (modelo, com diária) → **UnidadeEquipamento** (item físico,
  com patrimônio e status).
- **Cliente** com documento (CPF/CNPJ) único.
- **Locação** liga um cliente a uma unidade por um período, com máquina de estados
  `RESERVADA → RETIRADA → DEVOLVIDA` (e `RESERVADA → CANCELADA`).

Regras que o servidor garante:

- O cliente escolhe o **equipamento**; o sistema decide a **unidade** livre.
- Duas locações ativas da mesma unidade não podem ter períodos sobrepostos.
- O valor é **sempre calculado no servidor** (diária × dias); o cliente nunca manda preço.
- Dinheiro em **centavos inteiros**, nunca float.
- Transições de estado inválidas (devolver o que não foi retirado, etc.) são recusadas.

## Como rodar

Pré-requisitos: Node 20+ e Docker.

```bash
cp .env.example .env
docker compose up -d        # sobe o Postgres na porta 5433
npm install
npm run db:migrate          # aplica as migrations
npm run dev
```

A API sobe em `http://localhost:3333`. A documentação interativa fica em
`http://localhost:3333/docs` (e o JSON do OpenAPI em `/docs.json`).

### Testes

```bash
npm test
```

Os testes são de integração e batem num banco real (`locadora_test`, criado junto pelo
`docker-compose`). **Precisam do container de pé** — se o Postgres não estiver rodando,
o setup falha logo no começo. As tabelas são limpas entre cada teste.

### Scripts úteis

| Script                                    | O que faz              |
| ----------------------------------------- | ---------------------- |
| `npm run dev`                             | sobe a API com reload  |
| `npm run build` / `npm start`             | compila e roda o build |
| `npm test`                                | suíte de integração    |
| `npm run lint` / `npm run format`         | ESLint / Prettier      |
| `npm run db:migrate` / `npm run db:reset` | migrations             |

## Estrutura

```
src/
  modules/        uma pasta por recurso (rotas, service, schema, mapeador)
    categorias/  equipamentos/  unidades/  clientes/  locacoes/
  shared/
    erros/        hierarquia de erro da aplicação
    http/         erro central, paginação, rate limit
    openapi/      documento gerado dos schemas zod
    prisma/       client
  app.ts          monta o Express (testável, sem abrir porta)
  server.ts       sobe a porta
prisma/           schema + migrations (inclui a EXCLUDE constraint)
tests/            integração (Supertest)
```

## Decisões de arquitetura e trade-offs

**Concorrência na reserva — o ponto central.** A garantia de não-sobreposição é dupla:

1. Na aplicação, dentro de uma transação, seleciono uma unidade livre com
   `SELECT ... FOR UPDATE ... SKIP LOCKED`. Isso serializa a disputa: duas requisições
   simultâneas não enxergam a mesma unidade como disponível — uma trava a linha, a outra
   pula.
2. No banco, uma `EXCLUDE constraint` (`btree_gist` sobre `daterange`) é a rede de
   segurança final. Mesmo que algo escape da camada 1, o Postgres recusa o segundo insert.

Há um teste que dispara duas reservas simultâneas na última unidade e confirma que exatamente
uma vence (201) e a outra recebe 409.

**`app` separado de `server`.** O `app.ts` exporta uma função que monta o Express sem
escutar porta, então os testes sobem o app em memória via Supertest.

**Dinheiro em centavos.** Inteiro, pra não herdar erro de ponto flutuante.

**Prisma 6, não 7.** O Prisma 7 mudou bastante a ergonomia (tirou a `url` do schema, passou
a exigir driver adapter) e ainda trazia uma vuln transitiva no tooling de dev. Pro objetivo
aqui, o 6 é mais estável e direto. Mesma lógica no `zod-to-openapi`: fiquei na v7 porque a v8
exige zod 4.

**Paginação por offset.** `pagina`/`porPagina` com envelope de `meta`. É o suficiente pro
volume deste domínio; para listas muito grandes, cursor seria melhor — ficou como trade-off
conhecido.

**Erro centralizado.** Toda resposta de erro tem o mesmo formato:

```json
{ "erro": { "codigo": "CONFLITO", "mensagem": "...", "detalhes": {} } }
```

`ZodError` vira 400 com os campos, os erros de domínio carregam seu próprio status, e o resto
cai em 500 sem vazar stack.

## Segurança

O que está coberto e onde:

- **Validação no servidor em toda rota** (body, params e query) com zod. Validação no cliente
  seria só UX.
- **Zero SQL concatenado.** Prisma parametriza tudo; o único raw (a seleção com lock) usa
  parâmetros via `Prisma.sql`.
- **Segredos em `.env`** (`DATABASE_URL`), com `.env.example` versionado e `.env` no
  `.gitignore`.
- **Rate limiting** (`express-rate-limit`): teto geral por IP e um teto mais apertado na
  escrita, com foco em `POST /v1/locacoes`. Desligado em ambiente de teste.
- **Cabeçalhos de segurança** com helmet, incluindo CSP (afrouxada só o necessário em `/docs`
  para o Swagger UI carregar).

**Autenticação está fora de escopo aqui de propósito** — é assunto de um projeto dedicado do
portfólio. Esta API assume que a autenticação/autorização viria numa camada à frente.

## Backup

Backup é `pg_dump` do banco. Exemplo manual:

```bash
docker exec locadora-postgres pg_dump -U locadora -d locadora -F c -f /tmp/locadora.dump
docker cp locadora-postgres:/tmp/locadora.dump ./backups/locadora-$(date +%F).dump
```

Restaurar:

```bash
docker exec -i locadora-postgres pg_restore -U locadora -d locadora --clean /tmp/locadora.dump
```

Em produção eu agendaria isso num cron diário, com retenção e cópia pra um storage externo —
algo como:

```cron
# todo dia às 3h
0 3 * * * pg_dump "$DATABASE_URL" -F c | aws s3 cp - s3://meu-bucket/locadora/$(date +\%F).dump
```
