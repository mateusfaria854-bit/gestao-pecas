

export function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,8); }
export function fmtMoney(v){ v = Number(v)||0; return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
export function fmtDate(d){
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d || ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '—';
}
export function todayISO(){
  const d = new Date();
  const pad = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
// Escapa IDs interpolados em atributos HTML.
export function jsArg(v){ return escapeHtml(JSON.stringify(String(v))); }

export const CATEGORIAS = ['Funilaria','Elétrica','Mecânica','Borracharia'];
export const CAT_BADGE = {'Funilaria':'badge-blue','Elétrica':'badge-yellow','Mecânica':'badge-purple','Borracharia':'badge-green'};
export const CAT_BAR = {'Funilaria':'var(--blue)','Elétrica':'var(--accent)','Mecânica':'var(--purple)','Borracharia':'var(--green)'};
export const STATUS_PECA_BADGE = {'Disponível':'badge-green','Em Reforma':'badge-purple','Baixa':'badge-gray'};
export const STATUS_BAIXA_BADGE = {'Realizado':'badge-green','Pendente':'badge-red','Extra-Saldo':'badge-orange'};
export const STATUS_BAIXA_LABEL = {'Realizado':'✔ Realizado','Pendente':'⏳ Pendente','Extra-Saldo':'⚠ Extra-Saldo'};
export const TIPO_ENVIO_BADGE = {'Reforma':'badge-purple','Conserto':'badge-blue','Garantia':'badge-green'};
export const STATUS_ENVIO_BADGE = {'Enviado':'badge-yellow','Em andamento':'badge-blue','Retornado':'badge-green'};
export const LOG_BADGE = {'acesso':'badge-blue','cadastro':'badge-green','baixa':'badge-orange','envio':'badge-purple','retorno':'badge-green','exclusao':'badge-red'};
export const LOG_TIPO_LABEL = {'acesso':'Acesso','cadastro':'Cadastro/Edição','baixa':'Baixa','envio':'Envio','retorno':'Retorno','exclusao':'Exclusão'};

export const ITENS_POR_PAGINA = 60;
export function debounce(fn, delay){
  let t;
  return function(...args){
    clearTimeout(t);
    t = setTimeout(()=>fn.apply(this,args), delay);
  };
}
export function toggleSearchIcon(input){
  const icon = input.parentElement.querySelector('.search-icon');
  if(icon) icon.style.opacity = input.value.trim() ? '0' : '1';
}
export function normalizarNome(n){ return String(n||'').trim().toLowerCase(); }
export function escapeHtml(str){
  if(str===undefined||str===null) return '';
  return String(str).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
