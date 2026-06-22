import type { UnidadeEquipamento } from '@prisma/client';

export function apresentarUnidade(unidade: UnidadeEquipamento) {
  return {
    id: unidade.id,
    equipamentoId: unidade.equipamentoId,
    patrimonio: unidade.patrimonio,
    status: unidade.status,
    criadoEm: unidade.criadoEm,
  };
}
