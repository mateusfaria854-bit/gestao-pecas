import { LOG_BADGE, LOG_TIPO_LABEL, escapeHtml, uid } from '../../utils/helpers.js';
import { Dados, db } from '../../services/data-store.js';

export function renderLog(){
  const search = (document.getElementById('search-log').value||'').toLowerCase();
  const tipoF = document.getElementById('filter-log-tipo').value;
  const de = document.getElementById('filter-log-de').value;
  const ate = document.getElementById('filter-log-ate').value;
  let list = db.logs.filter(l=>{
    const dataLog = (l.timestamp||'').slice(0,10);
    if(tipoF && l.tipo!==tipoF) return false;
    if(de && dataLog < de) return false;
    if(ate && dataLog > ate) return false;
    if(search){
      const s = (l.usuario+' '+l.titulo+' '+l.detalhes).toLowerCase();
      if(!s.includes(search)) return false;
    }
    return true;
  }).sort((a,b)=> (b.timestamp||'').localeCompare(a.timestamp||''));

  const tbody = document.getElementById('log-tbody');
  tbody.innerHTML = '';
  document.getElementById('log-empty').style.display = list.length ? 'none' : 'block';
  list.forEach(l=>{
    const dt = new Date(l.timestamp);
    const dataFmt = isNaN(dt) ? '—' : dt.toLocaleString('pt-BR');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${dataFmt}</td>
      <td>${escapeHtml(l.usuario)}</td>
      <td><span class="badge ${LOG_BADGE[l.tipo]||'badge-gray'}">${escapeHtml(LOG_TIPO_LABEL[l.tipo]||l.tipo)}</span></td>
      <td>${escapeHtml(l.titulo)}</td>
      <td>${escapeHtml(l.detalhes)}</td>`;
    tbody.appendChild(tr);
  });
}

export function logAction(tipo, titulo, detalhes){
  const perfil = window.perfilAtual || {};
  return Dados.registrarLog({
    timestamp: new Date().toISOString(),
    usuario: window.usuarioAtual || 'Desconhecido',
    uid: perfil.uid || '',
    tipo, titulo,
    detalhes: detalhes || ''
  });
}
