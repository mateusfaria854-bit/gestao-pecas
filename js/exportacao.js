function celulaCsv(valor){
  if(valor === undefined || valor === null) return '';
  let texto = String(valor);
  if(typeof valor === 'string' && /^[\s]*[=+@\-\t\r]/.test(texto)) texto = "'" + texto;
  return '"' + texto.replace(/"/g,'""') + '"';
}
function baixarCsv(nomeArquivo, cabecalhos, linhas){
  if(!linhas.length){ notifyError('Não há registros para exportar com os filtros atuais.'); return false; }
  const linhasCsv = [cabecalhos, ...linhas].map(l => l.map(celulaCsv).join(';')).join('\r\n');
  const blob = new Blob(['\uFEFF',linhasCsv],{type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notifySuccess(`Arquivo ${nomeArquivo} preparado.`);
  return true;
}
function exportarEstoqueCSV(){
  const linhas = filtrarEstoque().map(p => [
    p.codigo||'',p.nome,p.categoria,p.quantidade,p.unidade||'un',p.minimo,
    p.local||'',custoMedioPeca(p).toFixed(2).replace('.',','),
    (custoMedioPeca(p)*(Number(p.quantidade)||0)).toFixed(2).replace('.',','),p.status||''
  ]);
  return baixarCsv('gestaopecas-estoque.csv',
    ['Código','Peça','Categoria','Quantidade','Unidade','Estoque mínimo','Local','Custo médio (R$)','Valor em estoque (R$)','Status'], linhas);
}
function exportarBaixasCSV(){
  const pecas = new Map(db.pecas.map(p=>[p.id,p]));
  (db.curvaA||[]).forEach(p=>{if(!pecas.has(p.origemId))pecas.set(p.origemId,p);});
  const linhas = filtrarBaixas().sort((a,b)=>(b.data||'').localeCompare(a.data||'')).map(b => {
    const p = pecas.get(b.pecaId);
    return [b.data||'',p?.nome||b.pecaNomeFallback||'',p?.codigo||b.pecaCodigoFallback||'',
      b.onibus||'',b.quantidade,b.statusBaixa||'Realizado',b.solicitante||'',b.registradoPor||'',b.obs||''];
  });
  return baixarCsv('gestaopecas-baixas.csv',
    ['Data','Peça','Código','Ônibus','Quantidade','Status','Solicitante','Entregue por','Observações'], linhas);
}
function exportarEnviosCSV(){
  const mes = document.getElementById('rel-mes').value;
  const linhas = db.envios.filter(e => !mes || (e.dataEnvio||'').slice(0,7)===mes)
    .sort((a,b)=>(b.dataEnvio||'').localeCompare(a.dataEnvio||''))
    .map(e => [e.dataEnvio||'',pecaNome(e.pecaId),fornNome(e.fornecedorId),
      e.tipo||'',e.status||'',Number(e.valor||0).toFixed(2).replace('.',','),e.dataRetorno||'',e.obs||'']);
  return baixarCsv(`gestaopecas-envios-${mes||'todos'}.csv`,
    ['Data do envio','Peça','Fornecedor','Tipo','Status','Valor (R$)','Data do retorno','Observações'], linhas);
}
function exportarRankingCSV(){
  const mes = document.getElementById('rel-mes').value;
  const envios = db.envios.filter(e=>!mes || (e.dataEnvio||'').slice(0,7)===mes);
  const linhas = db.fornecedores.map(f => {
    const itens = envios.filter(e=>e.fornecedorId===f.id);
    const total = itens.reduce((s,e)=>s+(Number(e.valor)||0),0);
    return [f.nome,itens.length,total.toFixed(2).replace('.',','),
      (itens.length ? total/itens.length : 0).toFixed(2).replace('.',','),
      itens.filter(e=>e.status!=='Retornado').length];
  }).sort((a,b)=>Number(b[2].replace(',','.'))-Number(a[2].replace(',','.')));
  return baixarCsv(`gestaopecas-fornecedores-${mes||'todos'}.csv`,
    ['Fornecedor','Envios','Valor total (R$)','Média (R$)','Pendentes'],linhas);
}
