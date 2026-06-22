import type { LocacaoDetalhada } from './locacoes.service.js';

export function apresentarLocacao(locacao: LocacaoDetalhada) {
  return {
    id: locacao.id,
    clienteId: locacao.clienteId,
    equipamentoId: locacao.unidade.equipamentoId,
    unidadeId: locacao.unidadeId,
    patrimonio: locacao.unidade.patrimonio,
    inicioEm: locacao.inicioEm,
    fimEm: locacao.fimEm,
    status: locacao.status,
    valorTotalCentavos: locacao.valorTotalCentavos,
    retiradaEm: locacao.retiradaEm,
    devolvidaEm: locacao.devolvidaEm,
    criadoEm: locacao.criadoEm,
  };
}
