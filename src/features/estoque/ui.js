import { CATEGORIAS, CAT_BADGE, ITENS_POR_PAGINA, STATUS_PECA_BADGE, debounce, escapeHtml, fmtDate, fmtMoney, jsArg, normalizarNome, todayISO, uid } from '../../utils/helpers.js';
import { db, saveDB } from '../../services/data-store.js';
import { logAction } from '../auditoria/ui.js';
import { atualizarBaixaEstoqueInfo } from '../baixas/ui.js';
import { statCard } from '../dashboard/ui.js';
import { renderAll } from '../../core/app.js';
import { custoMedioPeca, quantidadeValida, valorValido } from '../../domain/stock.js';
import { closeModal, openModal, showConfirm } from '../../components/modal.js';
import { notifyError } from '../../components/notifications.js';
import { uiState } from '../../core/state.js';

export function openPecaModal(id){
  document.getElementById('peca-id').value = id||'';
  if(id){
    const p = db.pecas.find(x=>x.id===id);
    document.getElementById('peca-modal-title').textContent = 'Editar Peça';
    document.getElementById('peca-nome').value = p.nome;
    document.getElementById('peca-codigo').value = p.codigo||'';
    document.getElementById('peca-categoria').value = p.categoria;
    document.getElementById('peca-quantidade').value = p.quantidade;
    document.getElementById('peca-minimo').value = p.minimo;
    document.getElementById('peca-unidade').value = p.unidade;
    document.getElementById('peca-valor').value = custoMedioPeca(p).toFixed(2);
    document.getElementById('peca-local').value = p.local||'';
    document.getElementById('peca-status').value = p.status;
    document.getElementById('peca-obs').value = p.obs||'';
    document.getElementById('peca-quantidade').disabled = true;
    document.getElementById('peca-valor').disabled = false;
    document.getElementById('peca-quantidade-label').textContent = 'Quantidade em Estoque';
    document.getElementById('peca-valor-label').textContent = 'Valor Unitário (R$)';
    document.getElementById('peca-entrada-nota').style.display = '';
  } else {
    document.getElementById('peca-modal-title').textContent = 'Nova Peça';
    ['peca-nome','peca-codigo','peca-local','peca-obs'].forEach(i=>document.getElementById(i).value='');
    document.getElementById('peca-categoria').value = uiState.estoqueCatFiltro || 'Funilaria';
    document.getElementById('peca-quantidade').value = 0;
    document.getElementById('peca-minimo').value = 0;
    document.getElementById('peca-unidade').value = 'un';
    document.getElementById('peca-valor').value = '';
    document.getElementById('peca-status').value = 'Disponível';
    document.getElementById('peca-quantidade').disabled = false;
    document.getElementById('peca-valor').disabled = false;
    document.getElementById('peca-quantidade-label').textContent = 'Quantidade Inicial em Estoque';
    document.getElementById('peca-valor-label').textContent = 'Valor Unitário Inicial (R$)';
    document.getElementById('peca-entrada-nota').style.display = 'none';
  }
  openModal('modal-peca');
}
export function savePeca(){
  const nome = document.getElementById('peca-nome').value.trim();
  if(!nome){ notifyError('Informe o nome da peça.'); return; }
  const id = document.getElementById('peca-id').value;
  const minimoRaw = document.getElementById('peca-minimo').value.trim();
  const minimo = Number(minimoRaw);
  const unidade = document.getElementById('peca-unidade').value;
  const valorRaw = document.getElementById('peca-valor').value.trim();
  const valorUnitario = Number(valorRaw);
  if(!minimoRaw || !quantidadeValida(minimo, unidade, true)){
    notifyError('Estoque mínimo inválido. Informe zero ou mais.'); return;
  }
  if(!valorRaw || !valorValido(valorUnitario)){
    notifyError('Informe um valor unitário válido (zero ou maior).'); return;
  }
  if(id){
    const idx = db.pecas.findIndex(x=>x.id===id);
    const existente = db.pecas[idx];
    const obj = {
      ...existente,
      nome,
      codigo: document.getElementById('peca-codigo').value.trim(),
      categoria: document.getElementById('peca-categoria').value,
      minimo,
      unidade: document.getElementById('peca-unidade').value,
      local: document.getElementById('peca-local').value.trim(),
      status: document.getElementById('peca-status').value,
      obs: document.getElementById('peca-obs').value.trim(),
    };
    const valorAnterior = custoMedioPeca(existente);
    const valorMudou = Math.abs(valorUnitario - valorAnterior) >= 0.005;
    if(valorMudou){
      obj.valor = valorUnitario;
      obj.valorAjustado = valorUnitario;
      obj.dataAjusteValor = todayISO();
    }
    db.pecas[idx] = obj;
    saveDB();
    logAction('cadastro', 'Peça editada', `${obj.nome}${obj.codigo?' ('+obj.codigo+')':''} — ${obj.categoria}${valorMudou?' · valor unitário '+fmtMoney(valorAnterior)+' → '+fmtMoney(valorUnitario):''}`);
  } else {
    const quantidadeRaw = document.getElementById('peca-quantidade').value.trim();
    const quantidadeInicial = Number(quantidadeRaw);
    if(!quantidadeRaw || !quantidadeValida(quantidadeInicial, unidade, true)){
      notifyError('Quantidade inicial inválida.'); return;
    }
    const valorInicial = valorUnitario;
    const obj = {
      id: uid(),
      nome,
      codigo: document.getElementById('peca-codigo').value.trim(),
      categoria: document.getElementById('peca-categoria').value,
      quantidade: quantidadeInicial,
      minimo,
      unidade: document.getElementById('peca-unidade').value,
      valor: valorInicial,
      entradas: quantidadeInicial>0 ? [{id:uid(), data:todayISO(), quantidade:quantidadeInicial, valorUnitario:valorInicial}] : [],
      local: document.getElementById('peca-local').value.trim(),
      status: document.getElementById('peca-status').value,
      obs: document.getElementById('peca-obs').value.trim(),
      dataCadastro: todayISO()
    };
    db.pecas.push(obj);
    saveDB();
    logAction('cadastro', 'Peça cadastrada', `${obj.nome}${obj.codigo?' ('+obj.codigo+')':''} — ${obj.categoria}`);
  }
  closeModal('modal-peca');
  renderAll();
}

export let comboItens = {};
export function comboAbrir(prefix){
  comboFiltro(prefix);
}
export function comboFiltro(prefix){
  const search = document.getElementById(prefix+'-peca-search');
  const dropdown = document.getElementById(prefix+'-peca-dropdown');
  if(!search || !dropdown) return;
  const items = comboItens[prefix] || [];
  const q = normalizarNome(search.value);
  const filtered = !q ? items : items.filter(p=>
    normalizarNome(p.nome).includes(q) || (p.codigo && String(p.codigo).toLowerCase().includes(q))
  );
  if(!items.length){
    dropdown.innerHTML = '<div class="combo-empty">Nenhuma peça disponível</div>';
  } else if(!filtered.length){
    dropdown.innerHTML = '<div class="combo-empty">Nenhuma peça encontrada para essa busca</div>';
  } else {
    dropdown.innerHTML = filtered.slice(0,60).map(p=>`
      <div class="combo-item" onmousedown="comboSelecionar(${jsArg(prefix)},${jsArg(p.id)})">
        <span class="combo-item-nome">${escapeHtml(p.nome)}</span>
        <span class="combo-item-sub">${p.codigo?('Cód. '+escapeHtml(p.codigo)):'sem código'} · estoque: ${p.quantidade} ${escapeHtml(p.unidade||'un')}</span>
      </div>`).join('');
  }
  dropdown.classList.add('open');
}
export function comboSelecionar(prefix, id){
  const items = comboItens[prefix] || [];
  const p = items.find(x=>x.id===id);
  if(!p) return;
  document.getElementById(prefix+'-peca').value = id;
  document.getElementById(prefix+'-peca-search').value = `${p.nome}${p.codigo?' ('+p.codigo+')':''}`;
  document.getElementById(prefix+'-peca-dropdown').classList.remove('open');
  if(prefix==='baixa') atualizarBaixaEstoqueInfo();
}
export function comboFechar(prefix){
  setTimeout(()=>{ const d = document.getElementById(prefix+'-peca-dropdown'); if(d) d.classList.remove('open'); }, 150);
}
export function comboLimpar(prefix){
  document.getElementById(prefix+'-peca').value = '';
  document.getElementById(prefix+'-peca-search').value = '';
  const d = document.getElementById(prefix+'-peca-dropdown');
  d.innerHTML = '';
  d.classList.remove('open');
}

export function openEntradaModal(){
  comboItens['entrada'] = [...db.pecas].sort((a,b)=>a.nome.localeCompare(b.nome));
  comboLimpar('entrada');
  document.getElementById('entrada-quantidade').value = 1;
  document.getElementById('entrada-valor').value = '';
  document.getElementById('entrada-data').value = todayISO();
  openModal('modal-entrada');
}
export function salvarEntrada(){
  const pecaId = document.getElementById('entrada-peca').value;
  const p = db.pecas.find(x=>x.id===pecaId);
  if(!p){ notifyError('Pesquise e selecione uma peça válida na lista.'); return; }
  const quantidadeRaw = document.getElementById('entrada-quantidade').value.trim();
  const valorRaw = document.getElementById('entrada-valor').value.trim();
  const quantidade = Number(quantidadeRaw);
  const valorUnitario = Number(valorRaw);
  if(!quantidadeRaw || !quantidadeValida(quantidade, p.unidade)){
    notifyError('Informe uma quantidade positiva e válida.'); return;
  }
  if(!valorRaw || !valorValido(valorUnitario)){
    notifyError('Informe um valor unitário válido (zero ou maior).'); return;
  }
  if(!Array.isArray(p.entradas)) p.entradas = [];
  p.entradas.push({id:uid(), data:document.getElementById('entrada-data').value||todayISO(), quantidade, valorUnitario});
  p.quantidade = (Number(p.quantidade)||0) + quantidade;
  // Novas entradas restabelecem a média histórica de compras.
  delete p.valorAjustado;
  delete p.dataAjusteValor;
  p.valor = custoMedioPeca(p);
  saveDB();
  logAction('cadastro', 'Entrada de estoque registrada', `${p.nome}${p.codigo?' ('+p.codigo+')':''} — +${quantidade} un a ${fmtMoney(valorUnitario)} (custo médio atualizado: ${fmtMoney(custoMedioPeca(p))})`);
  closeModal('modal-entrada');
  renderAll();
}
export function deletePeca(id){
  const p = db.pecas.find(x=>x.id===id);
  showConfirm('Excluir esta peça do estoque? Essa ação não pode ser desfeita.', ()=>{
    db.pecas = db.pecas.filter(x=>x.id!==id);
    saveDB();
    logAction('exclusao', 'Peça excluída', p ? `${p.nome}${p.codigo?' ('+p.codigo+')':''}` : id);
    closeModal('modal-confirm');
    renderAll();
  });
}
export function renderCatTabs(){
  const wrap = document.getElementById('estoque-cat-tabs');
  wrap.innerHTML = '';
  const all = document.createElement('button');
  all.type = 'button';
  all.setAttribute('aria-pressed', String(uiState.estoqueCatFiltro===''));
  all.className = 'cat-tab' + (uiState.estoqueCatFiltro===''?' active':'');
  all.textContent = 'Todas as categorias';
  all.onclick = ()=>{ uiState.estoqueCatFiltro=''; renderCatTabs(); renderEstoque(); };
  wrap.appendChild(all);
  CATEGORIAS.forEach(c=>{
    const d = document.createElement('button');
    d.type = 'button';
    d.setAttribute('aria-pressed', String(uiState.estoqueCatFiltro===c));
    d.className = 'cat-tab' + (uiState.estoqueCatFiltro===c?' active':'');
    d.textContent = c;
    d.onclick = ()=>{ uiState.estoqueCatFiltro=c; renderCatTabs(); renderEstoque(); };
    wrap.appendChild(d);
  });
}
export function filtrarEstoque(){
  const search = (document.getElementById('search-pecas').value||'').toLowerCase();
  const statusF = document.getElementById('filter-status-peca').value;
  return db.pecas.filter(p=>{
    if(uiState.estoqueCatFiltro && p.categoria!==uiState.estoqueCatFiltro) return false;
    if(statusF && p.status!==statusF) return false;
    if(search && !(p.nome.toLowerCase().includes(search) || (p.codigo||'').toLowerCase().includes(search) || (p.local||'').toLowerCase().includes(search))) return false;
    return true;
  }).sort((a,b)=>a.nome.localeCompare(b.nome));
}
export function renderEstoque(){
  const list = filtrarEstoque();

  const totalPaginas = Math.max(1, Math.ceil(list.length / ITENS_POR_PAGINA));
  if(uiState.estoquePagina > totalPaginas) uiState.estoquePagina = totalPaginas;
  if(uiState.estoquePagina < 1) uiState.estoquePagina = 1;
  const inicio = (uiState.estoquePagina-1) * ITENS_POR_PAGINA;
  const pageList = list.slice(inicio, inicio + ITENS_POR_PAGINA);

  const tbody = document.getElementById('pecas-tbody');
  document.getElementById('pecas-empty').style.display = list.length ? 'none' : 'block';

  const CAT_ROW_CLASS = {'Funilaria':'row-funilaria','Elétrica':'row-eletrica','Mecânica':'row-mecanica','Borracharia':'row-borracharia'};
  const frag = document.createDocumentFragment();
  pageList.forEach(p=>{
    const tr = document.createElement('tr');
    tr.className = CAT_ROW_CLASS[p.categoria] || '';
    const baixo = p.quantidade <= p.minimo;
    const custoMedio = custoMedioPeca(p);
    const valorTotalPeca = custoMedio * (Number(p.quantidade)||0);
    tr.innerHTML = `
      <td><strong>${escapeHtml(p.nome)}</strong>${p.obs?`<div style="font-size:11px;color:var(--muted);margin-top:2px;">${escapeHtml(p.obs)}</div>`:''}</td>
      <td><span class="codigo-peca">${escapeHtml(p.codigo)||'—'}</span></td>
      <td><span class="badge ${CAT_BADGE[p.categoria]||'badge-gray'}">${escapeHtml(p.categoria)}</span></td>
      <td>${baixo?`<span style="color:var(--red);font-weight:600;">${escapeHtml(p.quantidade)}</span>`:escapeHtml(p.quantidade)} ${escapeHtml(p.unidade)}</td>
      <td>${escapeHtml(p.minimo)}</td>
      <td>${escapeHtml(p.local)||'—'}</td>
      <td>${fmtMoney(custoMedio)}</td>
      <td><strong>${fmtMoney(valorTotalPeca)}</strong></td>
      <td><span class="badge ${STATUS_PECA_BADGE[p.status]||'badge-gray'}">${escapeHtml(p.status)}</span></td>
      <td><div class="actions">
        <button class="btn btn-ghost btn-sm" onclick="openPecaModal(${jsArg(p.id)})">✎ Editar</button>
        <button class="btn btn-ghost btn-sm" onclick="openMoverCurvaAModal(${jsArg(p.id)})" title="Mover para o estoque parado (Curva A)">🅰️ Curva A</button>
        <button class="btn btn-danger btn-sm" onclick="deletePeca(${jsArg(p.id)})">🗑</button>
      </div></td>`;
    frag.appendChild(tr);
  });
  tbody.innerHTML = '';
  tbody.appendChild(frag);

  const pagWrap = document.getElementById('pecas-pagination');
  if(list.length <= ITENS_POR_PAGINA){
    pagWrap.innerHTML = '';
  } else {
    pagWrap.innerHTML = `
      <button class="pagination-btn" ${uiState.estoquePagina<=1?'disabled':''} onclick="uiState.estoquePagina=1;renderEstoque()">« Primeira</button>
      <button class="pagination-btn" ${uiState.estoquePagina<=1?'disabled':''} onclick="uiState.estoquePagina--;renderEstoque()">‹ Anterior</button>
      <span class="pagination-info">Página ${uiState.estoquePagina} de ${totalPaginas} · ${list.length} peça(s)</span>
      <button class="pagination-btn" ${uiState.estoquePagina>=totalPaginas?'disabled':''} onclick="uiState.estoquePagina++;renderEstoque()">Próxima ›</button>
      <button class="pagination-btn" ${uiState.estoquePagina>=totalPaginas?'disabled':''} onclick="uiState.estoquePagina=${totalPaginas};renderEstoque()">Última »</button>
    `;
  }

  const valorTotalGeral = list.reduce((s,p)=>s+custoMedioPeca(p)*(Number(p.quantidade)||0),0);
  const totalItens = list.reduce((s,p)=>s+(Number(p.quantidade)||0),0);
  const custoMedioGeral = totalItens>0 ? valorTotalGeral/totalItens : 0;
  document.getElementById('estoque-stats').innerHTML = `
    ${statCard('Valor Total em Estoque', fmtMoney(valorTotalGeral), `${list.length} peça(s) na lista atual`)}
    ${statCard('Custo Médio Geral por Unidade', fmtMoney(custoMedioGeral), 'ponderado por todas as entradas')}
    ${statCard('Itens em Estoque', totalItens, 'unidades somadas')}
  `;
}

export const debouncedRenderCurvaA = debounce(()=>{ uiState.curvaPagina = 1; renderCurvaA(); }, 250);

export function openMoverCurvaAModal(id){
  const p = db.pecas.find(x=>x.id===id);
  if(!p) return;
  if(p.status==='Em Reforma'){
    notifyError('Esta peça está em reforma/envio. Registre o retorno antes de movê-la para a Curva A.');
    return;
  }
  const saldo = Number(p.quantidade)||0;
  if(saldo<=0){ notifyError('Esta peça não tem saldo em estoque para mover.'); return; }
  document.getElementById('curvaa-peca-id').value = id;
  document.getElementById('curvaa-peca-nome').textContent = p.nome + (p.codigo ? ' · Cód. '+p.codigo : '');
  document.getElementById('curvaa-peca-info').textContent = `Saldo atual em estoque: ${saldo} ${p.unidade||'un'}`;
  const q = document.getElementById('curvaa-quantidade');
  q.max = saldo;
  q.value = saldo;
  document.getElementById('curvaa-motivo').value = '';
  openModal('modal-curvaa-mover');
}
export function moverParaCurvaA(){
  const id = document.getElementById('curvaa-peca-id').value;
  const p = db.pecas.find(x=>x.id===id);
  if(!p){ notifyError('Peça não encontrada no estoque.'); return; }
  const saldo = Number(p.quantidade)||0;
  const qtd = Number(document.getElementById('curvaa-quantidade').value)||0;
  if(!quantidadeValida(qtd, p.unidade) || qtd>saldo){ notifyError(`Informe uma quantidade válida entre zero e ${saldo}.`); return; }
  const custo = custoMedioPeca(p);
  const motivo = document.getElementById('curvaa-motivo').value.trim();

  let item = db.curvaA.find(c=>c.origemId===p.id);
  if(item){
    const qAntiga = Number(item.quantidade)||0;
    item.valor = (qAntiga+qtd)>0 ? ((Number(item.valor)||0)*qAntiga + custo*qtd)/(qAntiga+qtd) : custo;
    item.quantidade = qAntiga + qtd;
    if(motivo) item.motivo = motivo;
  } else {
    db.curvaA.push({
      id: uid(),
      origemId: p.id,
      nome: p.nome,
      codigo: p.codigo||'',
      categoria: p.categoria,
      unidade: p.unidade||'un',
      minimo: p.minimo||0,
      local: p.local||'',
      obs: p.obs||'',
      dataCadastro: p.dataCadastro||'',
      quantidade: qtd,
      valor: custo,
      dataCurvaA: todayISO(),
      movidoPor: window.usuarioAtual||'',
      motivo
    });
  }

  // Sai do estoque principal: remove a peça se foi todo o saldo; senão só reduz a quantidade
  if(qtd===saldo){
    db.pecas = db.pecas.filter(x=>x.id!==p.id);
  } else {
    p.quantidade = saldo - qtd;
  }
  saveDB();
  logAction('cadastro', 'Peça movida para Curva A', `${p.nome}${p.codigo?' ('+p.codigo+')':''} — ${qtd} ${p.unidade||'un'}${qtd<saldo?' de '+saldo:''}${motivo?' · '+motivo:''}`);
  closeModal('modal-curvaa-mover');
  renderAll();
}
export function devolverDaCurvaA(id){
  const c = db.curvaA.find(x=>x.id===id);
  if(!c) return;
  showConfirm(`Devolver "${c.nome}" (${c.quantidade} ${c.unidade||'un'}) para Peças em Estoque?`, ()=>{
    const qtd = Number(c.quantidade)||0;
    const entrada = {id:uid(), data:todayISO(), quantidade:qtd, valorUnitario:Number(c.valor)||0};
    let p = db.pecas.find(x=>x.id===c.origemId);
    if(p){
      if(!Array.isArray(p.entradas)) p.entradas = [];
      p.entradas.push(entrada);
      p.quantidade = (Number(p.quantidade)||0) + qtd;
      p.valor = custoMedioPeca(p);
    } else {
      db.pecas.push({
        id: c.origemId,
        nome: c.nome,
        codigo: c.codigo||'',
        categoria: c.categoria,
        quantidade: qtd,
        minimo: c.minimo||0,
        unidade: c.unidade||'un',
        valor: Number(c.valor)||0,
        entradas: [entrada],
        local: c.local||'',
        status: 'Disponível',
        obs: c.obs||'',
        dataCadastro: c.dataCadastro||todayISO()
      });
    }
    db.curvaA = db.curvaA.filter(x=>x.id!==id);
    saveDB();
    logAction('cadastro', 'Peça devolvida da Curva A ao estoque', `${c.nome}${c.codigo?' ('+c.codigo+')':''} — ${qtd} ${c.unidade||'un'}`);
    closeModal('modal-confirm');
    renderAll();
  });
}
export function deleteCurvaA(id){
  const c = db.curvaA.find(x=>x.id===id);
  if(!c) return;
  showConfirm('Excluir esta peça da Curva A? Ela não voltará ao estoque. Essa ação não pode ser desfeita.', ()=>{
    db.curvaA = db.curvaA.filter(x=>x.id!==id);
    saveDB();
    logAction('exclusao', 'Peça excluída da Curva A', `${c.nome}${c.codigo?' ('+c.codigo+')':''} — ${c.quantidade} ${c.unidade||'un'}`);
    closeModal('modal-confirm');
    renderAll();
  });
}
export function renderCurvaA(){
  const search = (document.getElementById('search-curvaa').value||'').toLowerCase();
  const catF = document.getElementById('filter-cat-curvaa').value;
  const list = db.curvaA.filter(c=>{
    if(catF && c.categoria!==catF) return false;
    if(search && !((c.nome||'').toLowerCase().includes(search) || (c.codigo||'').toLowerCase().includes(search) || (c.local||'').toLowerCase().includes(search))) return false;
    return true;
  }).sort((a,b)=>a.nome.localeCompare(b.nome));

  const totalPaginas = Math.max(1, Math.ceil(list.length / ITENS_POR_PAGINA));
  if(uiState.curvaPagina > totalPaginas) uiState.curvaPagina = totalPaginas;
  if(uiState.curvaPagina < 1) uiState.curvaPagina = 1;
  const inicio = (uiState.curvaPagina-1) * ITENS_POR_PAGINA;
  const pageList = list.slice(inicio, inicio + ITENS_POR_PAGINA);

  document.getElementById('curvaa-empty').style.display = list.length ? 'none' : 'block';
  const CAT_ROW_CLASS = {'Funilaria':'row-funilaria','Elétrica':'row-eletrica','Mecânica':'row-mecanica','Borracharia':'row-borracharia'};
  const frag = document.createDocumentFragment();
  pageList.forEach(c=>{
    const tr = document.createElement('tr');
    tr.className = CAT_ROW_CLASS[c.categoria] || '';
    const valorTotal = (Number(c.valor)||0) * (Number(c.quantidade)||0);
    tr.innerHTML = `
      <td><strong>${escapeHtml(c.nome)}</strong>${c.motivo?`<div style="font-size:11px;color:var(--muted);margin-top:2px;">${escapeHtml(c.motivo)}</div>`:''}</td>
      <td><span class="codigo-peca">${escapeHtml(c.codigo)||'—'}</span></td>
      <td><span class="badge ${CAT_BADGE[c.categoria]||'badge-gray'}">${escapeHtml(c.categoria)}</span></td>
      <td>${escapeHtml(c.quantidade)} ${escapeHtml(c.unidade||'un')}</td>
      <td>${escapeHtml(c.local)||'—'}</td>
      <td>${fmtMoney(c.valor)}</td>
      <td><strong>${fmtMoney(valorTotal)}</strong></td>
      <td>${fmtDate(c.dataCurvaA)}${c.movidoPor?`<div style="font-size:11px;color:var(--muted);margin-top:2px;">${escapeHtml(c.movidoPor)}</div>`:''}</td>
      <td><div class="actions">
        <button class="btn btn-ghost btn-sm" onclick="devolverDaCurvaA(${jsArg(c.id)})" title="Devolver ao estoque principal">↩ Devolver</button>
        <button class="btn btn-danger btn-sm" onclick="deleteCurvaA(${jsArg(c.id)})">🗑</button>
      </div></td>`;
    frag.appendChild(tr);
  });
  const tbody = document.getElementById('curvaa-tbody');
  tbody.innerHTML = '';
  tbody.appendChild(frag);

  const pagWrap = document.getElementById('curvaa-pagination');
  if(list.length <= ITENS_POR_PAGINA){
    pagWrap.innerHTML = '';
  } else {
    pagWrap.innerHTML = `
      <button class="pagination-btn" ${uiState.curvaPagina<=1?'disabled':''} onclick="uiState.curvaPagina=1;renderCurvaA()">« Primeira</button>
      <button class="pagination-btn" ${uiState.curvaPagina<=1?'disabled':''} onclick="uiState.curvaPagina--;renderCurvaA()">‹ Anterior</button>
      <span class="pagination-info">Página ${uiState.curvaPagina} de ${totalPaginas} · ${list.length} peça(s)</span>
      <button class="pagination-btn" ${uiState.curvaPagina>=totalPaginas?'disabled':''} onclick="uiState.curvaPagina++;renderCurvaA()">Próxima ›</button>
      <button class="pagination-btn" ${uiState.curvaPagina>=totalPaginas?'disabled':''} onclick="uiState.curvaPagina=${totalPaginas};renderCurvaA()">Última »</button>
    `;
  }

  const valorTotalGeral = list.reduce((sum,c)=>sum+(Number(c.valor)||0)*(Number(c.quantidade)||0),0);
  const totalItens = list.reduce((sum,c)=>sum+(Number(c.quantidade)||0),0);
  document.getElementById('curvaa-stats').innerHTML = `
    ${statCard('Valor Parado na Curva A', fmtMoney(valorTotalGeral), 'capital imobilizado')}
    ${statCard('Peças na Curva A', list.length, 'códigos diferentes na lista atual')}
    ${statCard('Unidades Paradas', totalItens, 'unidades somadas')}
  `;
}
