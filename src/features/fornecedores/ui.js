import { escapeHtml, fmtMoney, jsArg, uid } from '../../utils/helpers.js';
import { db, saveDB } from '../../services/data-store.js';
import { logAction } from '../auditoria/ui.js';
import { renderAll } from '../../core/app.js';
import { closeModal, openModal, showConfirm } from '../../components/modal.js';
import { notifyError } from '../../components/notifications.js';

export function openFornecedorModal(id){
  document.getElementById('forn-id').value = id||'';
  if(id){
    const f = db.fornecedores.find(x=>x.id===id);
    document.getElementById('forn-modal-title').textContent = 'Editar Fornecedor';
    document.getElementById('forn-nome').value = f.nome;
    document.getElementById('forn-cnpj').value = f.cnpj||'';
    document.getElementById('forn-telefone').value = f.telefone||'';
    document.getElementById('forn-email').value = f.email||'';
    document.getElementById('forn-endereco').value = f.endereco||'';
    document.getElementById('forn-especialidade').value = f.especialidade||'';
    document.getElementById('forn-obs').value = f.obs||'';
  } else {
    document.getElementById('forn-modal-title').textContent = 'Novo Fornecedor';
    ['forn-nome','forn-cnpj','forn-telefone','forn-email','forn-endereco','forn-obs'].forEach(i=>document.getElementById(i).value='');
    document.getElementById('forn-especialidade').value = '';
  }
  openModal('modal-fornecedor');
}
export function saveFornecedor(){
  const nome = document.getElementById('forn-nome').value.trim();
  if(!nome){ notifyError('Informe o nome do fornecedor.'); return; }
  const id = document.getElementById('forn-id').value;
  const obj = {
    id: id || uid(),
    nome,
    cnpj: document.getElementById('forn-cnpj').value.trim(),
    telefone: document.getElementById('forn-telefone').value.trim(),
    email: document.getElementById('forn-email').value.trim(),
    endereco: document.getElementById('forn-endereco').value.trim(),
    especialidade: document.getElementById('forn-especialidade').value,
    obs: document.getElementById('forn-obs').value.trim()
  };
  if(id){
    const idx = db.fornecedores.findIndex(x=>x.id===id);
    db.fornecedores[idx] = obj;
  } else {
    db.fornecedores.push(obj);
  }
  saveDB();
  logAction('cadastro', id?'Fornecedor editado':'Fornecedor cadastrado', obj.nome);
  closeModal('modal-fornecedor');
  renderAll();
}
export function deleteFornecedor(id){
  const emUso = db.envios.some(e=>e.fornecedorId===id);
  if(emUso){ notifyError('Este fornecedor possui envios vinculados e não pode ser excluído.'); return; }
  const f = db.fornecedores.find(x=>x.id===id);
  showConfirm('Excluir este fornecedor? Essa ação não pode ser desfeita.', ()=>{
    db.fornecedores = db.fornecedores.filter(x=>x.id!==id);
    saveDB();
    logAction('exclusao', 'Fornecedor excluído', f ? f.nome : id);
    closeModal('modal-confirm');
    renderAll();
  });
}
export function renderFornecedores(){
  const search = (document.getElementById('search-fornecedores').value||'').toLowerCase();
  let list = db.fornecedores.filter(f=>{
    if(search && !(f.nome.toLowerCase().includes(search) || (f.cnpj||'').toLowerCase().includes(search))) return false;
    return true;
  }).sort((a,b)=>a.nome.localeCompare(b.nome));
  const grid = document.getElementById('fornecedores-grid');
  grid.innerHTML = '';
  document.getElementById('fornecedores-empty').style.display = list.length ? 'none' : 'block';
  list.forEach(f=>{
    const envios = db.envios.filter(e=>e.fornecedorId===f.id);
    const total = envios.reduce((s,e)=>s+(Number(e.valor)||0),0);
    const pendentes = envios.filter(e=>e.status!=='Retornado').length;
    const card = document.createElement('div');
    card.className = 'forn-card';
    card.onclick = ()=>openFornecedorModal(f.id);
    card.innerHTML = `
      <div class="forn-name">${escapeHtml(f.nome)}</div>
      <div class="forn-meta">${escapeHtml(f.especialidade||'Especialidade não informada')}${f.cnpj?' · '+escapeHtml(f.cnpj):''}</div>
      ${f.telefone?`<div class="forn-info-row">📞 ${escapeHtml(f.telefone)}</div>`:''}
      ${f.email?`<div class="forn-info-row">✉️ ${escapeHtml(f.email)}</div>`:''}
      ${f.endereco?`<div class="forn-info-row">📍 ${escapeHtml(f.endereco)}</div>`:''}
      <div class="forn-stats">
        <div class="forn-stat"><div class="forn-stat-val">${envios.length}</div><div class="forn-stat-label">Envios</div></div>
        <div class="forn-stat"><div class="forn-stat-val">${fmtMoney(total)}</div><div class="forn-stat-label">Total gasto</div></div>
        <div class="forn-stat"><div class="forn-stat-val">${pendentes}</div><div class="forn-stat-label">Pendentes</div></div>
      </div>
      <div class="actions" style="margin-top:12px;">
        <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();openFornecedorModal(${jsArg(f.id)})">✎ Editar</button>
        <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();deleteFornecedor(${jsArg(f.id)})">🗑 Excluir</button>
      </div>`;
    grid.appendChild(card);
  });
}
