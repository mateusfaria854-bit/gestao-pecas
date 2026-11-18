
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,8); }
function fmtMoney(v){ v = Number(v)||0; return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
function fmtDate(d){
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d || ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '—';
}
function todayISO(){
  const d = new Date();
  const pad = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
// Quantidades medidas (kg, metros, litros) admitem frações; peças individuais não.
function quantidadeValida(v, unidade, aceitarZero=false){
  return Number.isFinite(v) && (aceitarZero ? v >= 0 : v > 0) &&
    (['kg','m','litro'].includes(unidade) || Number.isInteger(v));
}
function valorValido(v){ return Number.isFinite(v) && v >= 0; }
// Escapa IDs interpolados em atributos HTML.
function jsArg(v){ return escapeHtml(JSON.stringify(String(v))); }

const CATEGORIAS = ['Funilaria','Elétrica','Mecânica','Borracharia'];
const CAT_BADGE = {'Funilaria':'badge-blue','Elétrica':'badge-yellow','Mecânica':'badge-purple','Borracharia':'badge-green'};
const CAT_BAR = {'Funilaria':'var(--blue)','Elétrica':'var(--accent)','Mecânica':'var(--purple)','Borracharia':'var(--green)'};
const STATUS_PECA_BADGE = {'Disponível':'badge-green','Em Reforma':'badge-purple','Baixa':'badge-gray'};
const STATUS_BAIXA_BADGE = {'Realizado':'badge-green','Pendente':'badge-red','Extra-Saldo':'badge-orange'};
const STATUS_BAIXA_LABEL = {'Realizado':'✔ Realizado','Pendente':'⏳ Pendente','Extra-Saldo':'⚠ Extra-Saldo'};
const TIPO_ENVIO_BADGE = {'Reforma':'badge-purple','Conserto':'badge-blue','Garantia':'badge-green'};
const STATUS_ENVIO_BADGE = {'Enviado':'badge-yellow','Em andamento':'badge-blue','Retornado':'badge-green'};
const LOG_BADGE = {'acesso':'badge-blue','cadastro':'badge-green','baixa':'badge-orange','envio':'badge-purple','retorno':'badge-green','exclusao':'badge-red'};
const LOG_TIPO_LABEL = {'acesso':'Acesso','cadastro':'Cadastro/Edição','baixa':'Baixa','envio':'Envio','retorno':'Retorno','exclusao':'Exclusão'};

let estoqueCatFiltro = '';
let estoquePagina = 1;
let baixasPagina = 1;
const ITENS_POR_PAGINA = 60;
let paginaAtual = 'dashboard';
function debounce(fn, delay){
  let t;
  return function(...args){
    clearTimeout(t);
    t = setTimeout(()=>fn.apply(this,args), delay);
  };
}
function toggleSearchIcon(input){
  const icon = input.parentElement.querySelector('.search-icon');
  if(icon) icon.style.opacity = input.value.trim() ? '0' : '1';
}
const focoAntesModal = new Map();
function openModal(id){
  const modal = document.getElementById(id);
  if(!modal) return;
  focoAntesModal.set(id, document.activeElement);
  modal.classList.add('open');
  const primeiro = modal.querySelector('input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled)');
  if(primeiro) primeiro.focus({ preventScroll:true });
}
function closeModal(id){
  const modal = document.getElementById(id);
  if(!modal) return;
  modal.classList.remove('open');
  const anterior = focoAntesModal.get(id);
  if(anterior && anterior.isConnected && typeof anterior.focus === 'function') anterior.focus({ preventScroll:true });
  focoAntesModal.delete(id);
}
document.addEventListener('keydown', event => {
  const modal = [...document.querySelectorAll('.modal-overlay.open')].at(-1);
  if(!modal) return;
  if(event.key === 'Escape'){
    event.preventDefault();
    closeModal(modal.id);
    return;
  }
  if(event.key !== 'Tab') return;
  const focaveis = [...modal.querySelectorAll('button:not(:disabled), input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]')].filter(el => el.getClientRects().length);
  if(!focaveis.length) return;
  const primeiro = focaveis[0], ultimo = focaveis.at(-1);
  if(event.shiftKey && document.activeElement === primeiro){event.preventDefault();ultimo.focus();}
  else if(!event.shiftKey && document.activeElement === ultimo){event.preventDefault();primeiro.focus();}
});
function normalizarNome(n){ return String(n||'').trim().toLowerCase(); }
function escapeHtml(str){
  if(str===undefined||str===null) return '';
  return String(str).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function showConfirm(msg, onConfirm){
  document.getElementById('confirm-msg').textContent = msg;
  const btn = document.getElementById('confirm-btn');
  btn.onclick = onConfirm;
  openModal('modal-confirm');
}

function notificar(mensagem, tipo='sucesso'){
  const area = document.getElementById('notificacoes');
  if(!area) return;
  const item = document.createElement('div');
  item.className = 'notificacao notificacao-' + (tipo === 'erro' ? 'erro' : 'sucesso');
  item.setAttribute('role', tipo === 'erro' ? 'alert' : 'status');
  const icone = document.createElement('span');
  icone.className = 'notificacao-icone';
  icone.setAttribute('aria-hidden','true');
  icone.textContent = tipo === 'erro' ? '!' : '✓';
  const texto = document.createElement('span');
  texto.className = 'notificacao-texto';
  texto.textContent = String(mensagem);
  const fechar = document.createElement('button');
  fechar.type = 'button';
  fechar.className = 'notificacao-fechar';
  fechar.textContent = '×';
  fechar.setAttribute('aria-label','Fechar notificação');
  const remover = () => { item.remove(); };
  fechar.addEventListener('click', remover);
  item.append(icone,texto,fechar);
  area.append(item);
  while(area.children.length > 3) area.firstElementChild.remove();
  setTimeout(remover, tipo === 'erro' ? 8000 : 3500);
}
function notifyError(mensagem){ notificar(mensagem,'erro'); }
function notifySuccess(mensagem){ notificar(mensagem,'sucesso'); }
