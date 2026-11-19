import { STATUS_ENVIO_BADGE, TIPO_ENVIO_BADGE, escapeHtml, fmtDate, fmtMoney, jsArg, todayISO, uid } from '../../utils/helpers.js';
import { db, saveDB } from '../../services/data-store.js';
import { logAction } from '../auditoria/ui.js';
import { statCard } from '../dashboard/ui.js';
import { renderAll } from '../../core/app.js';
import { valorValido } from '../../domain/stock.js';
import { closeModal, openModal, showConfirm } from '../../components/modal.js';
import { notifyError } from '../../components/notifications.js';

export function atualizarStatusEnvioPeca(pecaId){
  const peca = db.pecas.find(p => p.id === pecaId);
  if(!peca) return;
  const existeAberto = db.envios.some(e => e.pecaId === pecaId && e.status !== 'Retornado');
  if(existeAberto) peca.status = 'Em Reforma';
  else if(peca.status === 'Em Reforma') peca.status = 'Disponível';
}
export function populateEnvioSelects(){
  const pecaSel = document.getElementById('envio-peca');
  const fornSel = document.getElementById('envio-fornecedor');
  const curPeca = pecaSel.value, curForn = fornSel.value;
  pecaSel.innerHTML = '<option value="">Selecione a peça...</option>' +
    db.pecas.filter(p=>p.status!=='Baixa').map(p=>`<option value="${escapeHtml(p.id)}">${escapeHtml(p.nome)} ${p.codigo?'('+escapeHtml(p.codigo)+')':''} — ${escapeHtml(p.categoria)}</option>`).join('');
  fornSel.innerHTML = '<option value="">Selecione o fornecedor...</option>' +
    db.fornecedores.map(f=>`<option value="${escapeHtml(f.id)}">${escapeHtml(f.nome)}</option>`).join('');
  if(curPeca) pecaSel.value = curPeca;
  if(curForn) fornSel.value = curForn;
}
document.getElementById('envio-status').addEventListener('change', function(){
  document.getElementById('envio-retorno-data-wrap').style.display = this.value==='Retornado' ? '' : 'none';
});
export function openEnvioModal(id){
  populateEnvioSelects();
  document.getElementById('envio-id').value = id||'';
  document.getElementById('envio-retorno-data-wrap').style.display='none';
  if(id){
    const e = db.envios.find(x=>x.id===id);
    document.getElementById('envio-modal-title').textContent = 'Editar Envio';
    document.getElementById('envio-peca').value = e.pecaId;
    document.getElementById('envio-fornecedor').value = e.fornecedorId;
    document.getElementById('envio-tipo').value = e.tipo;
    document.getElementById('envio-data').value = e.dataEnvio;
    document.getElementById('envio-valor').value = e.valor;
    document.getElementById('envio-status').value = e.status;
    document.getElementById('envio-entregue-por').value = e.entreguePor||'';
    document.getElementById('envio-recebido-por').value = e.recebidoPor||'';
    document.getElementById('envio-obs').value = e.obs||'';
    document.getElementById('envio-data-retorno').value = e.dataRetorno||'';
    if(e.status==='Retornado') document.getElementById('envio-retorno-data-wrap').style.display='';
  } else {
    document.getElementById('envio-modal-title').textContent = 'Novo Envio para Reforma';
    document.getElementById('envio-peca').value = '';
    document.getElementById('envio-fornecedor').value = '';
    document.getElementById('envio-tipo').value = 'Reforma';
    document.getElementById('envio-data').value = todayISO();
    document.getElementById('envio-valor').value = '';
    document.getElementById('envio-status').value = 'Enviado';
    document.getElementById('envio-entregue-por').value = '';
    document.getElementById('envio-recebido-por').value = '';
    document.getElementById('envio-obs').value = '';
    document.getElementById('envio-data-retorno').value = '';
  }
  openModal('modal-envio');
}
export function saveEnvio(){
  const pecaId = document.getElementById('envio-peca').value;
  const fornecedorId = document.getElementById('envio-fornecedor').value;
  if(!pecaId || !fornecedorId){ notifyError('Selecione a peça e o fornecedor.'); return; }
  const id = document.getElementById('envio-id').value;
  const status = document.getElementById('envio-status').value;
  const tipo = document.getElementById('envio-tipo').value;
  const valorRaw = document.getElementById('envio-valor').value.trim();
  const valor = valorRaw ? Number(valorRaw) : 0;
  if(!db.pecas.some(p=>p.id===pecaId) || !db.fornecedores.some(f=>f.id===fornecedorId)){
    notifyError('Peça ou fornecedor inválido.'); return;
  }
  if(!['Enviado','Em andamento','Retornado'].includes(status) || !['Reforma','Conserto','Garantia'].includes(tipo)){
    notifyError('Tipo ou status de envio inválido.'); return;
  }
  if(!valorValido(valor)) { notifyError('Informe um valor de envio válido (zero ou maior).'); return; }
  const anterior = id ? db.envios.find(e=>e.id===id) : null;
  if(id && !anterior){ notifyError('Envio original não encontrado.'); return; }
  const obj = {
    id: id || uid(),
    pecaId, fornecedorId,
    tipo,
    dataEnvio: document.getElementById('envio-data').value || todayISO(),
    valor,
    status,
    entreguePor: document.getElementById('envio-entregue-por').value.trim(),
    recebidoPor: document.getElementById('envio-recebido-por').value.trim(),
    obs: document.getElementById('envio-obs').value.trim(),
    dataRetorno: status==='Retornado' ? (document.getElementById('envio-data-retorno').value||todayISO()) : ''
  };
  if(id){
    const idx = db.envios.findIndex(x=>x.id===id);
    db.envios[idx] = obj;
  } else {
    db.envios.push(obj);
  }
  // O status considera todos os envios da peça.
  if(anterior && anterior.pecaId !== pecaId) atualizarStatusEnvioPeca(anterior.pecaId);
  atualizarStatusEnvioPeca(pecaId);
  saveDB();
  logAction('envio', id?'Envio editado':'Novo envio registrado', `${pecaNome(pecaId)} → ${fornNome(fornecedorId)} (${obj.tipo}) — ${fmtMoney(obj.valor)}`);
  closeModal('modal-envio');
  renderAll();
}
export function registrarRetorno(id){
  const e = db.envios.find(x=>x.id===id);
  if(!e) return;
  e.status = 'Retornado';
  e.dataRetorno = todayISO();
  atualizarStatusEnvioPeca(e.pecaId);
  saveDB();
  logAction('retorno', 'Retorno de reforma registrado', `${pecaNome(e.pecaId)} de ${fornNome(e.fornecedorId)}`);
  renderAll();
}
export function deleteEnvio(id){
  const e = db.envios.find(x=>x.id===id);
  showConfirm('Excluir este registro de envio? Essa ação não pode ser desfeita.', ()=>{
    db.envios = db.envios.filter(x=>x.id!==id);
    if(e) atualizarStatusEnvioPeca(e.pecaId);
    saveDB();
    logAction('exclusao', 'Envio excluído', e ? `${pecaNome(e.pecaId)} → ${fornNome(e.fornecedorId)}` : id);
    closeModal('modal-confirm');
    renderAll();
  });
}
export function pecaNome(id){ const p = db.pecas.find(x=>x.id===id) || (db.curvaA||[]).find(c=>c.origemId===id); return p ? p.nome : '(peça removida)'; }
export function fornNome(id){ const f = db.fornecedores.find(x=>x.id===id); return f ? f.nome : '(fornecedor removido)'; }

export function renderEnvios(){
  const search = (document.getElementById('search-envios').value||'').toLowerCase();
  const tipoF = document.getElementById('filter-tipo-envio').value;
  const statusF = document.getElementById('filter-status-envio').value;

  const pecaPorId = new Map(db.pecas.map(p=>[p.id, p]));
  (db.curvaA||[]).forEach(c=>{ if(!pecaPorId.has(c.origemId)) pecaPorId.set(c.origemId, c); });
  const fornPorId = new Map(db.fornecedores.map(f=>[f.id, f]));
  const nomePeca = id => { const p = pecaPorId.get(id); return p ? p.nome : '(peça removida)'; };
  const nomeForn = id => { const f = fornPorId.get(id); return f ? f.nome : '(fornecedor removido)'; };

  let list = db.envios.filter(e=>{
    if(tipoF && e.tipo!==tipoF) return false;
    if(statusF && e.status!==statusF) return false;
    if(search){
      const s = (nomePeca(e.pecaId)+' '+nomeForn(e.fornecedorId)).toLowerCase();
      if(!s.includes(search)) return false;
    }
    return true;
  }).sort((a,b)=> (b.dataEnvio||'').localeCompare(a.dataEnvio||''));

  const wrap = document.getElementById('envios-list');
  const frag = document.createDocumentFragment();
  document.getElementById('envios-empty').style.display = list.length ? 'none' : 'block';
  list.forEach(e=>{
    const card = document.createElement('div');
    card.className = 'envio-card';
    card.innerHTML = `
      <div class="envio-head">
        <div>
          <div class="envio-peca">${escapeHtml(nomePeca(e.pecaId))}</div>
          <div class="envio-sub">Fornecedor: ${escapeHtml(nomeForn(e.fornecedorId))}</div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
          <span class="badge ${TIPO_ENVIO_BADGE[e.tipo]||'badge-gray'}">${escapeHtml(e.tipo)}</span>
          <span class="badge ${STATUS_ENVIO_BADGE[e.status]||'badge-gray'}">${escapeHtml(e.status)}</span>
        </div>
      </div>
      <div class="envio-grid">
        <div class="envio-field"><div class="envio-field-label">Data envio</div><div class="envio-field-val">${fmtDate(e.dataEnvio)}</div></div>
        <div class="envio-field"><div class="envio-field-label">Valor</div><div class="envio-field-val">${fmtMoney(e.valor)}</div></div>
        <div class="envio-field"><div class="envio-field-label">Entregue por</div><div class="envio-field-val">${escapeHtml(e.entreguePor)||'—'}</div></div>
        <div class="envio-field"><div class="envio-field-label">Recebido por</div><div class="envio-field-val">${escapeHtml(e.recebidoPor)||'—'}</div></div>
      </div>
      ${e.status==='Retornado'
        ? `<div class="retorno-ok">✔ Retornado em ${fmtDate(e.dataRetorno)}</div>`
        : `<div class="retorno-pendente"><span>⏳ Aguardando retorno do fornecedor</span><button class="btn btn-retorno btn-sm" onclick="registrarRetorno(${jsArg(e.id)})">Registrar Retorno</button></div>`}
      ${e.obs?`<div style="font-size:12px;color:var(--muted);margin-top:8px;">${escapeHtml(e.obs)}</div>`:''}
      <div class="actions" style="margin-top:10px;">
        <button class="btn btn-ghost btn-sm" onclick="openEnvioModal(${jsArg(e.id)})">✎ Editar</button>
        <button class="btn btn-danger btn-sm" onclick="deleteEnvio(${jsArg(e.id)})">🗑 Excluir</button>
      </div>`;
    frag.appendChild(card);
  });
  wrap.innerHTML = '';
  wrap.appendChild(frag);

  const total = db.envios.length;
  const abertos = db.envios.filter(e=>e.status!=='Retornado').length;
  const concluidos = db.envios.filter(e=>e.status==='Retornado');
  const mediaGeral = db.envios.length ? db.envios.reduce((s,e)=>s+(Number(e.valor)||0),0)/db.envios.length : 0;
  const gastoMes = db.envios.filter(e=>(e.dataEnvio||'').slice(0,7)===todayISO().slice(0,7)).reduce((s,e)=>s+(Number(e.valor)||0),0);
  document.getElementById('reformas-stats').innerHTML = `
    ${statCard('Total de Envios', total, '')}
    ${statCard('Em Aberto', abertos, 'aguardando retorno')}
    ${statCard('Valor Médio / Envio', fmtMoney(mediaGeral), '')}
    ${statCard('Gasto no Mês', fmtMoney(gastoMes), '')}
  `;
}
