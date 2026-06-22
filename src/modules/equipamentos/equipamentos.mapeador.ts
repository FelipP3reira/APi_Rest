import type { Equipamento, UnidadeEquipamento } from '@prisma/client';

export function apresentarEquipamento(equipamento: Equipamento) {
  return {
    id: equipamento.id,
    categoriaId: equipamento.categoriaId,
    nome: equipamento.nome,
    descricao: equipamento.descricao,
    valorDiariaCentavos: equipamento.valorDiariaCentavos,
    caucaoCentavos: equipamento.caucaoCentavos,
    ativo: equipamento.ativo,
    criadoEm: equipamento.criadoEm,
    atualizadoEm: equipamento.atualizadoEm,
  };
}

export function apresentarDisponibilidade(
  equipamentoId: string,
  de: Date,
  ate: Date,
  unidadesLivres: UnidadeEquipamento[],
) {
  return {
    equipamentoId,
    periodo: { de, ate },
    unidadesDisponiveis: unidadesLivres.length,
    unidades: unidadesLivres.map((unidade) => ({
      id: unidade.id,
      patrimonio: unidade.patrimonio,
    })),
  };
}
