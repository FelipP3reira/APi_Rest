-- CreateEnum
CREATE TYPE "StatusUnidade" AS ENUM ('DISPONIVEL', 'MANUTENCAO', 'INATIVA');

-- CreateEnum
CREATE TYPE "StatusLocacao" AS ENUM ('RESERVADA', 'RETIRADA', 'DEVOLVIDA', 'CANCELADA');

-- CreateTable
CREATE TABLE "categorias" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipamentos" (
    "id" UUID NOT NULL,
    "categoriaId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "valorDiariaCentavos" INTEGER NOT NULL,
    "caucaoCentavos" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unidades_equipamento" (
    "id" UUID NOT NULL,
    "equipamentoId" UUID NOT NULL,
    "patrimonio" TEXT NOT NULL,
    "status" "StatusUnidade" NOT NULL DEFAULT 'DISPONIVEL',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unidades_equipamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locacoes" (
    "id" UUID NOT NULL,
    "clienteId" UUID NOT NULL,
    "unidadeId" UUID NOT NULL,
    "inicioEm" DATE NOT NULL,
    "fimEm" DATE NOT NULL,
    "status" "StatusLocacao" NOT NULL DEFAULT 'RESERVADA',
    "valorTotalCentavos" INTEGER NOT NULL,
    "retiradaEm" TIMESTAMP(3),
    "devolvidaEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categorias_nome_key" ON "categorias"("nome");

-- CreateIndex
CREATE INDEX "equipamentos_categoriaId_idx" ON "equipamentos"("categoriaId");

-- CreateIndex
CREATE UNIQUE INDEX "unidades_equipamento_patrimonio_key" ON "unidades_equipamento"("patrimonio");

-- CreateIndex
CREATE INDEX "unidades_equipamento_equipamentoId_idx" ON "unidades_equipamento"("equipamentoId");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_documento_key" ON "clientes"("documento");

-- CreateIndex
CREATE INDEX "locacoes_clienteId_idx" ON "locacoes"("clienteId");

-- CreateIndex
CREATE INDEX "locacoes_unidadeId_idx" ON "locacoes"("unidadeId");

-- CreateIndex
CREATE INDEX "locacoes_status_idx" ON "locacoes"("status");

-- AddForeignKey
ALTER TABLE "equipamentos" ADD CONSTRAINT "equipamentos_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unidades_equipamento" ADD CONSTRAINT "unidades_equipamento_equipamentoId_fkey" FOREIGN KEY ("equipamentoId") REFERENCES "equipamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locacoes" ADD CONSTRAINT "locacoes_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locacoes" ADD CONSTRAINT "locacoes_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "unidades_equipamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Barreira final contra dupla reserva: duas locações ativas (não canceladas) da
-- mesma unidade não podem ter períodos que se sobreponham. Resolve no banco a
-- corrida que a checagem na aplicação sozinha não garante.
-- Editado à mão na migration gerada — o Prisma não modela EXCLUDE constraint.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "locacoes"
    ADD CONSTRAINT "locacoes_sem_sobreposicao"
    EXCLUDE USING gist (
        "unidadeId" WITH =,
        daterange("inicioEm", "fimEm", '[]') WITH &&
    )
    WHERE ("status" <> 'CANCELADA');
