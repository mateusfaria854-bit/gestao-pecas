// Quantidades medidas (kg, metros, litros) admitem frações; peças individuais não.
export function quantidadeValida(v, unidade, aceitarZero=false){
  return Number.isFinite(v) && (aceitarZero ? v >= 0 : v > 0) &&
    (['kg','m','litro'].includes(unidade) || Number.isInteger(v));
}
export function valorValido(v){ return Number.isFinite(v) && v >= 0; }

export function custoMedioPeca(p){
  // Ajustes de valor não alteram o histórico de compras.
  if(p.valorAjustado !== undefined && p.valorAjustado !== null && valorValido(Number(p.valorAjustado))){
    return Number(p.valorAjustado);
  }
  if(Array.isArray(p.entradas) && p.entradas.length){
    let qtd=0, tot=0;
    p.entradas.forEach(e=>{ qtd += Number(e.quantidade)||0; tot += (Number(e.quantidade)||0)*(Number(e.valorUnitario)||0); });
    if(qtd>0) return tot/qtd;
  }
  return Number(p.valor)||0;
}
