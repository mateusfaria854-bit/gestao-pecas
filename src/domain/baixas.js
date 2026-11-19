import { quantidadeValida } from './stock.js';

/** Calcula alterações de saldo antes de modificar qualquer registro. */
export function calcularSaldosBaixa(pecas, anterior, pecaId, quantidade, status) {
  const peca = pecas.find(p => p.id === pecaId);
  if (!peca) throw new Error('Peça não encontrada no estoque.');
  if (!['Realizado','Pendente','Extra-Saldo'].includes(status)) throw new Error('Status da baixa inválido.');
  if (!quantidadeValida(Number(quantidade), peca.unidade)) throw new Error('Quantidade de baixa inválida.');
  const saldos = new Map([[peca.id, Number(peca.quantidade)]]);
  if (anterior && (anterior.statusBaixa || 'Realizado') === 'Realizado') {
    const original = pecas.find(p => p.id === anterior.pecaId);
    if (!original) throw new Error('A peça da baixa original não existe mais no estoque. Não é possível estornar automaticamente.');
    if (!saldos.has(original.id)) saldos.set(original.id, Number(original.quantidade));
    saldos.set(original.id, saldos.get(original.id) + Number(anterior.quantidade));
  }
  if (status === 'Realizado') saldos.set(peca.id, saldos.get(peca.id) - quantidade);
  if ([...saldos.values()].some(v => !Number.isFinite(v) || v < -1e-9)) {
    throw new Error('Saldo insuficiente para registrar a baixa como Realizado. Verifique a quantidade ou utilize Extra-Saldo, que não desconta estoque.');
  }
  return saldos;
}
