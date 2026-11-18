import { ITENS_POR_PAGINA, STATUS_BAIXA_BADGE, STATUS_BAIXA_LABEL, escapeHtml, fmtDate, jsArg, todayISO, uid } from '../../utils/helpers.js';
import { db, saveDB } from '../../services/data-store.js';
import { verificarOSAbertaManutencao } from '../../services/maintenance.js';
import { logAction } from '../auditoria/ui.js';
import { comboItens, comboLimpar } from '../estoque/ui.js';
import { pecaNome } from '../reformas/ui.js';
import { statCard } from '../dashboard/ui.js';
import { renderAll } from '../../core/app.js';
import { quantidadeValida } from '../../domain/stock.js';
import { calcularSaldosBaixa } from '../../domain/baixas.js';
import { closeModal, openModal, showConfirm } from '../../components/modal.js';
import { notifyError } from '../../components/notifications.js';
import { uiState } from '../../core/state.js';

export function populateBaixaPecaCombo(){
  comboItens['baixa'] = [...db.pecas].filter(p=>p.status!=='Baixa').sort((a,b)=>a.nome.localeCompare(b.nome));
}
export function atualizarBaixaEstoqueInfo(){
  const info = document.getElementById('baixa-peca-estoque-info');
  const p = db.pecas.find(x=>x.id===document.getElementById('baixa-peca').value);
  info.textContent = p ? `Estoque atual: ${p.quantidade} ${p.unidade||'un'}` : '';
}
export function openBaixaModal(id){
  populateBaixaPecaCombo();
  comboLimpar('baixa');
  document.getElementById('baixa-id').value = id||'';
  if(id){
    const b = db.baixas.find(x=>x.id===id);
    const p = db.pecas.find(x=>x.id===b.pecaId);
    document.getElementById('baixa-modal-title').textContent = 'Editar Baixa';
    document.getElementById('baixa-peca').value = b.pecaId||'';
    document.getElementById('baixa-peca-search').value = p ? `${p.nome}${p.codigo?' ('+p.codigo+')':''}` : (b.pecaNomeFallback||'');
    document.getElementById('baixa-onibus').value = b.onibus;
    document.getElementById('baixa-qtd').value = b.quantidade;
    document.getElementById('baixa-data').value = b.data;
    document.getElementById('baixa-solicitante').value = b.solicitante||'';
    document.getElementById('baixa-registrado-por').value = b.registradoPor||'';
    document.getElementById('baixa-status').value = b.statusBaixa || 'Realizado';
    document.getElementById('baixa-obs').value = b.obs||'';
  } else {
    document.getElementById('baixa-modal-title').textContent = 'Nova Baixa para Ônibus';
    document.getElementById('baixa-onibus').value = '';
    document.getElementById('baixa-qtd').value = 1;
    document.getElementById('baixa-data').value = todayISO();
    document.getElementById('baixa-solicitante').value = '';
    document.getElementById('baixa-registrado-por').value = '';
    document.getElementById('baixa-status').value = 'Realizado';
    document.getElementById('baixa-obs').value = '';
  }
  atualizarBaixaEstoqueInfo();
  openModal('modal-baixa');
}
export async function saveBaixa(){
  const pecaId = document.getElementById('baixa-peca').value;
  const onibus = document.getElementById('baixa-onibus').value.trim();
  const qtdRaw = document.getElementById('baixa-qtd').value.trim();
  const qtd = Number(qtdRaw);
  const id = document.getElementById('baixa-id').value;
  const statusBaixa = document.getElementById('baixa-status').value;
  const peca = db.pecas.find(p => p.id === pecaId);
  const antiga = id ? db.baixas.find(b => b.id === id) : null;
  if(!peca || !onibus){ notifyError('Pesquise e selecione a peça na lista, e informe o código do ônibus.'); return; }
  if(id && !antiga){ notifyError('Baixa original não encontrada. Atualize a página e tente novamente.'); return; }
  if(!qtdRaw || !quantidadeValida(qtd, peca.unidade)){
    notifyError('Informe uma quantidade positiva e válida. Para peças individuais, use números inteiros.'); return;
  }
  if(!['Realizado','Pendente','Extra-Saldo'].includes(statusBaixa)){
    notifyError('Status da baixa inválido.'); return;
  }

  let saldos;
  try { saldos = calcularSaldosBaixa(db.pecas, antiga, pecaId, qtd, statusBaixa); }
  catch (error) { notifyError(error.message); return; }

  const btnSalvar = document.getElementById('baixa-submit-btn');
  const textoOriginalBtn = btnSalvar ? btnSalvar.textContent : '';
  if(btnSalvar){ btnSalvar.disabled = true; btnSalvar.textContent = 'Verificando OS...'; }
  let resultado;
  try{ resultado = await verificarOSAbertaManutencao(onibus); }
  catch(e){ resultado = { erro: e?.message || 'Falha inesperada' }; }
  finally { if(btnSalvar){ btnSalvar.disabled = false; btnSalvar.textContent = textoOriginalBtn; } }
  if(resultado.erro){
    notifyError('Não foi possível verificar a Ordem de Serviço agora. Tente novamente em instantes.\n\nDetalhe técnico: ' + resultado.erro);
    return;
  }
  if(!resultado.possuiOSAberta){
    notifyError(`Não há Ordem de Serviço ABERTA para o veículo ${onibus}.\nA baixa não pode ser registrada sem uma OS aberta.`);
    return;
  }

  const obj = {
    id: id || uid(), pecaId, onibus, quantidade: qtd,
    data: document.getElementById('baixa-data').value || todayISO(),
    solicitante: document.getElementById('baixa-solicitante').value.trim(),
    registradoPor: document.getElementById('baixa-registrado-por').value.trim(),
    statusBaixa,
    osVinculada: (resultado.osAbertas || []).map(o=>o.os).join(', '),
    obs: document.getElementById('baixa-obs').value.trim()
  };
  for(const [pecaAlteradaId, saldo] of saldos){
    const registro = db.pecas.find(p => p.id === pecaAlteradaId);
    registro.quantidade = Math.max(0, saldo);
  }
  if(id) db.baixas[db.baixas.findIndex(b => b.id === id)] = obj;
  else db.baixas.push(obj);
  saveDB();
  logAction('baixa', id?'Baixa editada':'Baixa registrada para ônibus', `${peca.nome}${peca.codigo?' ('+peca.codigo+')':''} → ${onibus} · Qtd ${qtd} · ${statusBaixa} · OS: ${obj.osVinculada}`);
  closeModal('modal-baixa');
  renderAll();
}
export function deleteBaixa(id){
  const b = db.baixas.find(x=>x.id===id);
  showConfirm('Excluir este registro de baixa? Se a baixa estava marcada como "Realizado", a quantidade será devolvida ao estoque. O histórico continuará no log de atividades.', ()=>{
    const peca = db.pecas.find(p=>p.id===b.pecaId);
    if(peca && (b.statusBaixa||'Realizado')==='Realizado'){
      peca.quantidade = (Number(peca.quantidade)||0) + (Number(b.quantidade)||0);
    }
    db.baixas = db.baixas.filter(x=>x.id!==id);
    saveDB();
    logAction('exclusao', 'Baixa excluída', b ? `${pecaNome(b.pecaId)} → ${b.onibus} · Qtd ${escapeHtml(b.quantidade)}` : id);
    closeModal('modal-confirm');
    renderAll();
  });
}
export let baixasExpandedCodigos = new Set();
export let ultimoGruposCodigoKeys = [];
export function toggleBaixaCodigo(codigo){
  if(baixasExpandedCodigos.has(codigo)) baixasExpandedCodigos.delete(codigo);
  else baixasExpandedCodigos.add(codigo);
  renderBaixas();
}
export function expandirTodosCodigos(){
  ultimoGruposCodigoKeys.forEach(c=> baixasExpandedCodigos.add(c));
  renderBaixas();
}
export function recolherTodosCodigos(){
  baixasExpandedCodigos.clear();
  renderBaixas();
}
export function filtrarBaixas(){
  const searchProduto = (document.getElementById('search-baixas-produto').value||'').toLowerCase();
  const searchFrota = (document.getElementById('search-baixas-frota').value||'').toLowerCase();
  const de = document.getElementById('filter-baixa-de').value;
  const ate = document.getElementById('filter-baixa-ate').value;
  const statusF = document.getElementById('filter-baixa-status').value;

  // Índice de peças para evitar buscas repetidas em históricos extensos.
  const pecaPorId = new Map(db.pecas.map(p=>[p.id, p]));
  (db.curvaA||[]).forEach(c=>{ if(!pecaPorId.has(c.origemId)) pecaPorId.set(c.origemId, c); });

  return db.baixas.filter(b=>{
    if(de && b.data < de) return false;
    if(ate && b.data > ate) return false;
    if(statusF && (b.statusBaixa||'Realizado')!==statusF) return false;
    if(searchProduto){
      const p = pecaPorId.get(b.pecaId);
      const s = ((p?p.nome:(b.pecaNomeFallback||''))+' '+(p?p.codigo:(b.pecaCodigoFallback||''))).toLowerCase();
      if(!s.includes(searchProduto)) return false;
    }
    if(searchFrota){
      const s = ((b.onibus||'')+' '+(b.solicitante||'')).toLowerCase();
      if(!s.includes(searchFrota)) return false;
    }
    return true;
  });
}
export function renderBaixas(){
  const agrupar = document.getElementById('filter-baixa-agrupar').value;
  const searchFrota = (document.getElementById('search-baixas-frota').value||'').toLowerCase();
  const pecaPorId = new Map(db.pecas.map(p=>[p.id,p]));
  (db.curvaA||[]).forEach(c=>{ if(!pecaPorId.has(c.origemId)) pecaPorId.set(c.origemId,c); });
  let list = filtrarBaixas();

  const tbody = document.getElementById('baixas-tbody');
  document.getElementById('baixas-empty').style.display = list.length ? 'none' : 'block';
  const frag = document.createDocumentFragment(); // acumula tudo fora do DOM, insere de uma vez só no final

  function linhaBaixa(b){
    const p = pecaPorId.get(b.pecaId);
    const nomeExibir = p ? p.nome : (b.pecaNomeFallback || '(peça não localizada no cadastro)');
    const codigoExibir = p ? p.codigo : (b.pecaCodigoFallback || '');
    const status = b.statusBaixa || 'Realizado';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${fmtDate(b.data)}</td>
      <td><strong>${escapeHtml(nomeExibir)}</strong></td>
      <td><span class="codigo-peca">${escapeHtml(codigoExibir)||'—'}</span></td>
      <td><span class="placa-onibus">${escapeHtml(b.onibus)}</span></td>
      <td>${escapeHtml(b.quantidade)}</td>
      <td>${escapeHtml(b.solicitante)||'—'}</td>
      <td>${escapeHtml(b.registradoPor)||'—'}</td>
      <td><span class="badge ${STATUS_BAIXA_BADGE[status]||'badge-red'}">${escapeHtml(STATUS_BAIXA_LABEL[status]||status)}</span></td>
      <td>${escapeHtml(b.obs)||'—'}</td>
      <td><div class="actions">
        <button class="btn btn-ghost btn-sm" onclick="openBaixaModal(${jsArg(b.id)})">✎ Editar</button>
        <button class="btn btn-danger btn-sm" onclick="deleteBaixa(${jsArg(b.id)})">🗑</button>
      </div></td>`;
    return tr;
  }

  const btnExpandir = document.getElementById('btn-expandir-codigos');
  const btnRecolher = document.getElementById('btn-recolher-codigos');
  btnExpandir.style.display = agrupar==='codigo' ? 'inline-block' : 'none';
  btnRecolher.style.display = agrupar==='codigo' ? 'inline-block' : 'none';

  if(agrupar==='onibus'){
    const grupos = Object.create(null);
    list.forEach(b=>{ (grupos[b.onibus] = grupos[b.onibus]||[]).push(b); });
    const onibusOrdenados = Object.keys(grupos).sort((a,b)=>a.localeCompare(b, 'pt-BR', {numeric:true}));
    onibusOrdenados.forEach(onibus=>{
      const grupo = grupos[onibus].sort((a,b)=>(a.data||'').localeCompare(b.data||''));
      const trHeader = document.createElement('tr');
      trHeader.innerHTML = `<td colspan="10" style="background:var(--dark);font-weight:700;font-size:12.5px;color:var(--accent-bright);padding:10px 16px;">🚌 ${escapeHtml(onibus)} — ${grupo.length} baixa(s)</td>`;
      frag.appendChild(trHeader);
      grupo.forEach(b=> frag.appendChild(linhaBaixa(b)));
    });
  } else if(agrupar==='codigo'){
    const grupos = Object.create(null);
    list.forEach(b=>{
      const p = pecaPorId.get(b.pecaId);
      const codigo = (p ? p.codigo : b.pecaCodigoFallback) || '(sem código)';
      const nome = p ? p.nome : (b.pecaNomeFallback || '(peça não localizada no cadastro)');
      if(!grupos[codigo]) grupos[codigo] = { nome, itens: [] };
      grupos[codigo].itens.push(b);
    });
    const codigosOrdenados = Object.keys(grupos).sort((a,b)=>a.localeCompare(b, 'pt-BR', {numeric:true}));
    ultimoGruposCodigoKeys = codigosOrdenados;

    codigosOrdenados.forEach(codigo=>{
      const { nome, itens } = grupos[codigo];
      const grupo = itens.sort((a,b)=> (b.data||'').localeCompare(a.data||''));
      const totalQtd = grupo.reduce((s,b)=> s + (Number(b.quantidade)||0), 0);
      const pendentes = grupo.filter(b=> (b.statusBaixa||'Realizado')==='Pendente').length;
      const isExpanded = baixasExpandedCodigos.has(codigo);

      const trHeader = document.createElement('tr');
      trHeader.style.cursor = 'pointer';
      trHeader.innerHTML = `<td colspan="10" style="background:var(--dark);padding:10px 16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:9px;">
            <span style="font-size:10px;color:var(--muted);display:inline-block;width:10px;">${isExpanded?'▼':'▶'}</span>
            <span style="font-weight:700;font-size:12.5px;color:var(--accent-bright);">📦 ${escapeHtml(codigo)}</span>
            <span style="color:var(--light);font-size:12.5px;">${escapeHtml(nome)}</span>
          </div>
          <div style="display:flex;align-items:center;gap:12px;font-size:11.5px;color:var(--muted);">
            <span>${grupo.length} saída(s)</span>
            <span>${totalQtd} un.</span>
            ${pendentes>0?`<span class="badge badge-red">${pendentes} pendente(s)</span>`:''}
          </div>
        </div>
      </td>`;
      trHeader.addEventListener('click', ()=> toggleBaixaCodigo(codigo));
      frag.appendChild(trHeader);

      if(isExpanded){
        grupo.forEach(b=> frag.appendChild(linhaBaixa(b)));
      }
    });
  } else {
    list.sort((a,b)=> (b.data||'').localeCompare(a.data||''));
    const totalPaginasFlat = Math.max(1, Math.ceil(list.length / ITENS_POR_PAGINA));
    if(uiState.baixasPagina > totalPaginasFlat) uiState.baixasPagina = totalPaginasFlat;
    if(uiState.baixasPagina < 1) uiState.baixasPagina = 1;
    const inicioFlat = (uiState.baixasPagina-1) * ITENS_POR_PAGINA;
    list.slice(inicioFlat, inicioFlat + ITENS_POR_PAGINA).forEach(b=> frag.appendChild(linhaBaixa(b)));
  }
  tbody.innerHTML = '';
  tbody.appendChild(frag);

  const pagWrap = document.getElementById('baixas-pagination');
  if(agrupar!=='data' || list.length <= ITENS_POR_PAGINA){
    pagWrap.innerHTML = '';
  } else {
    const totalPaginas = Math.max(1, Math.ceil(list.length / ITENS_POR_PAGINA));
    pagWrap.innerHTML = `
      <button class="pagination-btn" ${uiState.baixasPagina<=1?'disabled':''} onclick="uiState.baixasPagina=1;renderBaixas()">« Primeira</button>
      <button class="pagination-btn" ${uiState.baixasPagina<=1?'disabled':''} onclick="uiState.baixasPagina--;renderBaixas()">‹ Anterior</button>
      <span class="pagination-info">Página ${uiState.baixasPagina} de ${totalPaginas} · ${list.length} baixa(s)</span>
      <button class="pagination-btn" ${uiState.baixasPagina>=totalPaginas?'disabled':''} onclick="uiState.baixasPagina++;renderBaixas()">Próxima ›</button>
      <button class="pagination-btn" ${uiState.baixasPagina>=totalPaginas?'disabled':''} onclick="uiState.baixasPagina=${totalPaginas};renderBaixas()">Última »</button>
    `;
  }

  const totalBaixas = db.baixas.length;
  const noMes = db.baixas.filter(b=>(b.data||'').slice(0,7)===todayISO().slice(0,7)).length;
  const naoDadas = db.baixas.filter(b=>(b.statusBaixa||'Realizado')==='Pendente').length;
  const onibusCount = Object.create(null);
  db.baixas.forEach(b=>{ onibusCount[b.onibus] = (onibusCount[b.onibus]||0)+1; });
  const topOnibusEntry = Object.entries(onibusCount).sort((a,b)=>b[1]-a[1])[0];
  document.getElementById('baixas-stats').innerHTML = `
    ${statCard('Total de Baixas', totalBaixas, '')}
    ${statCard('Baixas no Mês', noMes, '')}
    ${statCard('Pendentes', naoDadas, '')}
    ${statCard('Ônibus/Destino com mais baixas', topOnibusEntry?topOnibusEntry[0]:'—', topOnibusEntry?`${topOnibusEntry[1]} baixa(s)`:'')}
  `;

  const frotaStatsEl = document.getElementById('frota-baixas-stats');
  const buscaFrota = searchFrota.trim();
  if(buscaFrota){
    const baixasFrota = db.baixas.filter(b=>(b.onibus||'').toLowerCase().includes(buscaFrota));
    const limite30 = new Date(); limite30.setDate(limite30.getDate()-30);
    const limite30ISO = limite30.toISOString().slice(0,10);
    const totalFrota = baixasFrota.length;
    const ultimos30Frota = baixasFrota.filter(b=>b.data && b.data>=limite30ISO).length;
    const pendentesFrota = baixasFrota.filter(b=>(b.statusBaixa||'Realizado')==='Pendente').length;
    frotaStatsEl.style.display = '';
    frotaStatsEl.innerHTML = `
      ${statCard('Baixas em todo o período', totalFrota, `Frota/ônibus contendo "${buscaFrota}"`)}
      ${statCard('Baixas nos últimos 30 dias', ultimos30Frota, '')}
      ${statCard('Pendentes', pendentesFrota, '')}
    `;
  } else {
    frotaStatsEl.style.display = 'none';
    frotaStatsEl.innerHTML = '';
  }
}
