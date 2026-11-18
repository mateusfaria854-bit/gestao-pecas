/* Bundle gerado por npm run build. Edite os arquivos em src/. */

// Fonte: src/core/state.js
const uiState = { estoqueCatFiltro:'', estoquePagina:1, baixasPagina:1, curvaPagina:1, paginaAtual:'dashboard' };



// Fonte: src/domain/stock.js
// Quantidades medidas (kg, metros, litros) admitem frações; peças individuais não.
function quantidadeValida(v, unidade, aceitarZero=false){
  return Number.isFinite(v) && (aceitarZero ? v >= 0 : v > 0) &&
    (['kg','m','litro'].includes(unidade) || Number.isInteger(v));
}
function valorValido(v){ return Number.isFinite(v) && v >= 0; }

function custoMedioPeca(p){
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



// Fonte: src/domain/baixas.js

/** Calcula alterações de saldo antes de modificar qualquer registro. */
function calcularSaldosBaixa(pecas, anterior, pecaId, quantidade, status) {
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



// Fonte: src/domain/csv.js
function celulaCsv(valor){
  if(valor === undefined || valor === null) return '';
  let texto = String(valor);
  if(typeof valor === 'string' && /^[\s]*[=+@\-\t\r]/.test(texto)) texto = "'" + texto;
  return '"' + texto.replace(/"/g,'""') + '"';
}



// Fonte: src/utils/helpers.js


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

const ITENS_POR_PAGINA = 60;
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
function normalizarNome(n){ return String(n||'').trim().toLowerCase(); }
function escapeHtml(str){
  if(str===undefined||str===null) return '';
  return String(str).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}



// Fonte: src/components/modal.js


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

function showConfirm(msg, onConfirm){
  document.getElementById('confirm-msg').textContent = msg;
  const btn = document.getElementById('confirm-btn');
  btn.onclick = onConfirm;
  openModal('modal-confirm');
}




// Fonte: src/components/notifications.js


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



// Fonte: src/services/data-store.js




/* Backends de demonstração (em memória) e Firebase. */
const APP_CONFIG = Object.assign({ validarOSAberta: true }, window.APP_CONFIG || {});
const FIREBASE_CONFIG = window.FIREBASE_CONFIG || null;
const MODO_DEMO = !FIREBASE_CONFIG || !FIREBASE_CONFIG.apiKey || /^(SUA_|YOUR_)/i.test(FIREBASE_CONFIG.apiKey) || typeof firebase === 'undefined';

const COLECOES = ['pecas', 'curvaA', 'fornecedores', 'envios', 'baixas'];
const PERFIS_VALIDOS = ['admin', 'user'];

let db = { pecas: [], curvaA: [], fornecedores: [], envios: [], baixas: [], logs: [], usuarios: [] };

function clonar(v){ return JSON.parse(JSON.stringify(v)); }

function paraArray(val, colecao){
  if(!val) return [];
  if(Array.isArray(val)) return val.filter(Boolean);
  const itens = Object.entries(val).map(([k, v]) => (colecao === 'logs' || colecao === 'usuarios') ? { id: k, ...v } : v);
  if(colecao === 'logs') itens.sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
  return itens;
}

function criarBackendFirebase(){
  let auth, raiz, appAux = null;
  return {
    modo: 'firebase',
    iniciar(){
      firebase.initializeApp(FIREBASE_CONFIG);
      auth = firebase.auth();
      raiz = firebase.database().ref('gestaoPecasApp');
    },
    aoMudarAutenticacao(cb){
      auth.onAuthStateChanged(async user => {
        if(!user){ cb(null); return; }
        try{
          const p = (await raiz.child('usuarios').child(user.uid).once('value')).val();
          if(!p || !PERFIS_VALIDOS.includes(p.role)){
            await auth.signOut();
            cb(null, 'Esta conta não possui perfil autorizado no sistema. Procure um administrador.');
            return;
          }
          cb({ uid: user.uid, nome: p.nome, email: user.email, role: p.role });
        } catch(e){
          await auth.signOut();
          cb(null, 'Não foi possível validar o seu perfil de acesso.');
        }
      });
    },
    entrar({ email, senha }){ return auth.signInWithEmailAndPassword(email, senha); },
    sair(){ return auth.signOut(); },
    ouvir(colecao, cb, cbErro){
      let ref = raiz.child(colecao);
      if(colecao === 'logs') ref = ref.limitToLast(500);
      const handler = ref.on('value', snap => cb(paraArray(snap.val(), colecao)), cbErro);
      return () => ref.off('value', handler);
    },
    salvarColecao(colecao, arr){ return raiz.child(colecao).set(clonar(arr)); },
    registrarLog(entrada){ return raiz.child('logs').push(entrada); },
    salvarPerfil(uid, perfil){ return raiz.child('usuarios').child(uid).set(perfil); },
    removerPerfil(uid){ return raiz.child('usuarios').child(uid).remove(); },
    // Mantém a sessão do administrador ao cadastrar outra conta.
    async criarContaAuth(email, senha){
      if(!appAux) appAux = firebase.initializeApp(FIREBASE_CONFIG, 'aux');
      const cred = await appAux.auth().createUserWithEmailAndPassword(email, senha);
      await appAux.auth().signOut();
      return cred.user.uid;
    },
    enviarRedefinicaoSenha(email){ return auth.sendPasswordResetEmail(email); }
  };
}

function criarBackendDemo(){
  let store = null;
  let perfilAtualDemo = null;
  const ouvintes = {};      // colecao -> [callbacks]
  const ouvintesAuth = [];

  function notificar(colecao){
    (ouvintes[colecao] || []).forEach(cb => cb(clonar(store[colecao] || [])));
  }
  async function carregar(){
    if(store) return;
    if(window.DEMO_DATA){ store = clonar(window.DEMO_DATA); }
    else {
      const resp = await fetch('data/demo-data.json');
      if(!resp.ok) throw new Error('data/demo-data.json não encontrado');
      store = await resp.json();
    }
    ['pecas', 'curvaA', 'fornecedores', 'envios', 'baixas', 'logs', 'usuarios'].forEach(k => { if(!store[k]) store[k] = []; });
  }
  return {
    modo: 'demo',
    iniciar(){},
    aoMudarAutenticacao(cb){
      ouvintesAuth.push(cb);
      carregar().then(() => cb(perfilAtualDemo))
        .catch(() => cb(null, 'Não foi possível carregar os dados de demonstração. Verifique se data/demo-data.js existe.'));
    },
    perfisDemo(){ return clonar(store ? store.usuarios : []); },
    async entrar({ uid }){
      const p = (store.usuarios || []).find(u => u.id === uid);
      if(!p) throw new Error('Perfil de demonstração não encontrado.');
      perfilAtualDemo = { uid: p.id, nome: p.nome, email: p.email, role: p.role };
      ouvintesAuth.forEach(cb => cb(perfilAtualDemo));
    },
    async sair(){ perfilAtualDemo = null; ouvintesAuth.forEach(cb => cb(null)); },
    ouvir(colecao, cb){
      (ouvintes[colecao] = ouvintes[colecao] || []).push(cb);
      Promise.resolve().then(() => cb(clonar(store[colecao] || [])));
      return () => { ouvintes[colecao] = ouvintes[colecao].filter(f => f !== cb); };
    },
    async salvarColecao(colecao, arr){ store[colecao] = clonar(arr); Promise.resolve().then(() => notificar(colecao)); },
    async registrarLog(entrada){ store.logs.push({ id: uid(), ...clonar(entrada) }); Promise.resolve().then(() => notificar('logs')); },
    async salvarPerfil(id, perfil){
      const i = store.usuarios.findIndex(u => u.id === id);
      const novo = { id, ...clonar(perfil) };
      if(i >= 0) store.usuarios[i] = novo; else store.usuarios.push(novo);
      Promise.resolve().then(() => notificar('usuarios'));
    },
    async removerPerfil(id){ store.usuarios = store.usuarios.filter(u => u.id !== id); Promise.resolve().then(() => notificar('usuarios')); },
    async criarContaAuth(){ return 'demo-' + uid(); },
    async enviarRedefinicaoSenha(){  }
  };
}

const Dados = MODO_DEMO ? criarBackendDemo() : criarBackendFirebase();

let salvandoAgora = false;
const _ultimoSalvo = {};

// No Firebase, a coleção só é marcada como salva após a confirmação da gravação.
function saveDB(){
  const pendentes = COLECOES.filter(c => JSON.stringify(db[c]) !== _ultimoSalvo[c]);
  if(!pendentes.length) return Promise.resolve(true);
  salvandoAgora = true;
  return Promise.all(pendentes.map(async c => {
    const copia = clonar(db[c]);
    const versao = JSON.stringify(copia);
    await Dados.salvarColecao(c, copia);
    if(JSON.stringify(db[c]) === versao) _ultimoSalvo[c] = versao;
  }))
    .then(() => { notifySuccess('Alterações salvas.'); return true; })
    .catch(err => {
      console.error('Erro ao salvar', err);
      notifyError('Não foi possível salvar as alterações. Verifique sua conexão e suas permissões.');
      return false;
    })
    .finally(() => { salvandoAgora = false; });
}

function normalizarDb(){
  COLECOES.concat(['logs', 'usuarios']).forEach(k => { if(!Array.isArray(db[k])) db[k] = []; });
  db.pecas.forEach(p => { if(!Array.isArray(p.entradas)) p.entradas = []; });
}

let _desinscrever = [];
function iniciarSincronizacao(aoConectar){
  _desinscrever.forEach(f => f());
  _desinscrever = [];
  const colecoes = COLECOES.slice();
  if(isAdmin()){ colecoes.push('logs', 'usuarios'); }
  const pendentes = new Set(colecoes);
  let conectado = false;
  colecoes.forEach(c => {
    const off = Dados.ouvir(c, dados => {
      db[c] = dados;
      if(COLECOES.includes(c)) _ultimoSalvo[c] = JSON.stringify(dados);
      normalizarDb();
      pendentes.delete(c);
      if(!conectado && pendentes.size === 0){
        conectado = true;
        aoConectar();
      } else if(conectado){
        renderAll();
      }
    }, err => {
      console.error('Erro de conexão com o banco de dados', c, err);
      document.getElementById('loading-overlay').style.display = 'flex';
      document.getElementById('loading-text').textContent = 'Sem permissão ou sem conexão com o banco de dados.';
    });
    _desinscrever.push(off);
  });
}



// Fonte: src/services/maintenance.js

/* Na demonstração, a validação de OS usa os registros fictícios de data/demo-data.json. */
let _osSimuladas = null;

async function carregarOSSimuladas(){
  if(_osSimuladas) return _osSimuladas;
  if(window.DEMO_DATA){ _osSimuladas = window.DEMO_DATA.ordensServico || []; return _osSimuladas; }
  const resp = await fetch('data/demo-data.json');
  if(!resp.ok) throw new Error('Dados de demonstração indisponíveis.');
  _osSimuladas = (await resp.json()).ordensServico || [];
  return _osSimuladas;
}

function normalizarCodigoVeiculo(v){
  return String(v ?? '').trim().replace(/^0+/, '');
}

async function verificarOSAbertaManutencao(codigoVeiculo){
  if(!APP_CONFIG.validarOSAberta) return { possuiOSAberta: true, osAbertas: [], erro: null };
  try{
    const ordens = await carregarOSSimuladas();
    const alvo = normalizarCodigoVeiculo(codigoVeiculo);
    const osAbertas = ordens.filter(o => o.aberta && normalizarCodigoVeiculo(o.veiculo) === alvo);
    return { possuiOSAberta: osAbertas.length > 0, osAbertas, erro: null };
  } catch(err){
    console.error('Erro ao consultar ordens de serviço', err);
    return { possuiOSAberta: false, osAbertas: [], erro: err.message || String(err) };
  }
}



// Fonte: src/features/auth/ui.js




/* Autorização efetiva no Firebase depende das Security Rules; ocultar telas não restringe acesso aos dados. */
window.perfilAtual = null;
window.usuarioAtual = null;   // nome de exibição, usado nos registros e no log

const PERMISSOES = {
  verLog:            ['admin'],
  gerenciarUsuarios: ['admin'],
  operarEstoque:     ['admin', 'user']
};
function temPermissao(p){ return !!window.perfilAtual && PERMISSOES[p].includes(window.perfilAtual.role); }
function isAdmin(){ return !!window.perfilAtual && window.perfilAtual.role === 'admin'; }
function podeVerLog(){ return temPermissao('verLog'); }
function podeGerenciarUsuarios(){ return temPermissao('gerenciarUsuarios'); }

function mostrarLogin(mensagem){
  document.getElementById('loading-overlay').style.display = 'none';
  document.getElementById('ident-overlay').style.display = 'flex';
  const demo = Dados.modo === 'demo';
  document.getElementById('ident-panel-demo').style.display = demo ? '' : 'none';
  document.getElementById('ident-panel-firebase').style.display = demo ? 'none' : '';
  if(demo && Dados.perfisDemo){
    const lista = Dados.perfisDemo();
    document.getElementById('login-demo-usuario').innerHTML = lista.map(u =>
      `<option value="${escapeHtml(u.id)}">${escapeHtml(u.nome)} (${u.role === 'admin' ? 'administrador' : 'usuário'})</option>`).join('');
  }
  document.getElementById('ident-erro').textContent = mensagem || '';
}

async function loginUsuario(){
  const erroEl = document.getElementById('ident-erro');
  erroEl.textContent = '';
  const email = document.getElementById('login-email').value.trim();
  const senha = document.getElementById('login-senha').value;
  if(!email || !senha){ erroEl.textContent = 'Informe e-mail e senha.'; return; }
  try{
    await Dados.entrar({ email, senha });
    document.getElementById('login-senha').value = '';
  } catch(e){
    // Mensagem genérica de propósito: não revela se o e-mail existe.
    erroEl.textContent = 'E-mail ou senha inválidos.';
  }
}
async function loginDemo(){
  const uidSel = document.getElementById('login-demo-usuario').value;
  try{ await Dados.entrar({ uid: uidSel }); }
  catch(e){ document.getElementById('ident-erro').textContent = e.message; }
}
async function recuperarSenha(){
  const erroEl = document.getElementById('ident-erro');
  const email = document.getElementById('login-email').value.trim();
  if(!email){ erroEl.textContent = 'Informe seu e-mail para receber o link de redefinição.'; return; }
  try{ await Dados.enviarRedefinicaoSenha(email); } catch(e){  }
  erroEl.style.color = 'var(--green)';
  erroEl.textContent = 'Se o e-mail estiver cadastrado, você receberá um link de redefinição.';
  setTimeout(() => { erroEl.style.color = ''; }, 6000);
}

function aoMudarSessao(perfil, mensagem){
  if(!perfil){
    window.perfilAtual = null;
    window.usuarioAtual = null;
    _desinscrever.forEach(f => f());
    _desinscrever = [];
    mostrarLogin(mensagem);
    return;
  }
  window.perfilAtual = perfil;
  window.usuarioAtual = perfil.nome;
  document.getElementById('loading-overlay').style.display = 'flex';
  document.getElementById('loading-text').textContent = 'Carregando dados...';
  iniciarSincronizacao(() => {
    document.getElementById('loading-overlay').style.display = 'none';
    document.getElementById('ident-overlay').style.display = 'none';
    atualizarRodapeUsuario();
    logAction('acesso', 'Entrada no sistema', `Usuário: ${perfil.nome}`);
    goPage('dashboard');
  });
}

async function sair(){
  try{ await logAction('acesso', 'Saída do sistema', `Usuário: ${window.usuarioAtual || 'Desconhecido'}`); } catch(e){}
  await Dados.sair();
  if(Dados.modo === 'firebase') location.reload();
}

function atualizarRodapeUsuario(){
  const papel = isAdmin() ? 'administrador' : 'usuário';
  document.getElementById('sidebar-footer').innerHTML =
    (Dados.modo === 'demo' ? '<div style="color:var(--accent);margin-bottom:4px;">Modo demonstração</div>' : '') +
    `Usuário: <strong style="color:var(--light)">${escapeHtml(window.usuarioAtual || '—')}</strong> (${papel}) · ` +
    `<span style="color:var(--accent);cursor:pointer;" onclick="sair()">Sair</span>`;
}



// Fonte: src/features/auditoria/ui.js


function renderLog(){
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

function logAction(tipo, titulo, detalhes){
  const perfil = window.perfilAtual || {};
  return Dados.registrarLog({
    timestamp: new Date().toISOString(),
    usuario: window.usuarioAtual || 'Desconhecido',
    uid: perfil.uid || '',
    tipo, titulo,
    detalhes: detalhes || ''
  });
}



// Fonte: src/features/usuarios/ui.js







/* Perfis são protegidos pelas Security Rules no modo Firebase. */
function renderUsuarios(){
  if(!podeGerenciarUsuarios()) return;
  const search = normalizarNome(document.getElementById('search-usuarios').value || '');
  let list = [...(db.usuarios || [])];
  if(search) list = list.filter(u => normalizarNome(u.nome).includes(search) || normalizarNome(u.email).includes(search));
  list.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  document.getElementById('usuarios-tbody').innerHTML = list.map(u => {
    const eu = window.perfilAtual && u.id === window.perfilAtual.uid;
    return `
    <tr>
      <td>${escapeHtml(u.nome)}${eu ? ' <span class="badge badge-blue">você</span>' : ''}</td>
      <td>${escapeHtml(u.email)}</td>
      <td><span class="badge ${u.role === 'admin' ? 'badge-purple' : 'badge-gray'}">${u.role === 'admin' ? 'Administrador' : 'Usuário'}</span></td>
      <td>${fmtDate(u.dataCadastro)}</td>
      <td class="actions">
        <button class="btn btn-ghost btn-sm" onclick="openUsuarioModal(${jsArg(u.id)})">✎ Editar</button>
        <button class="btn btn-danger btn-sm" onclick="deleteUsuario(${jsArg(u.id)})">🗑 Excluir</button>
      </td>
    </tr>`;
  }).join('');
  document.getElementById('usuarios-empty').style.display = list.length ? 'none' : '';
}

function openUsuarioModal(id){
  if(!podeGerenciarUsuarios()) return;
  const u = id ? (db.usuarios || []).find(x => x.id === id) : null;
  document.getElementById('usuario-id').value = u ? u.id : '';
  document.getElementById('usuario-modal-title').textContent = u ? 'Editar Usuário' : 'Novo Usuário';
  document.getElementById('usuario-nome').value = u ? u.nome : '';
  document.getElementById('usuario-email').value = u ? u.email : '';
  document.getElementById('usuario-email').disabled = !!u;
  document.getElementById('usuario-senha').value = '';
  document.getElementById('usuario-senha-grupo').style.display = u ? 'none' : '';
  document.getElementById('usuario-role').value = u ? u.role : 'user';
  document.getElementById('usuario-reset-btn').style.display = u ? '' : 'none';
  openModal('modal-usuario');
}

async function salvarUsuario(){
  if(!podeGerenciarUsuarios()) return;
  const id = document.getElementById('usuario-id').value;
  const nome = document.getElementById('usuario-nome').value.trim();
  const email = document.getElementById('usuario-email').value.trim().toLowerCase();
  const senha = document.getElementById('usuario-senha').value;
  const role = document.getElementById('usuario-role').value;
  if(!nome){ notifyError('Informe o nome completo.'); return; }
  if(!PERFIS_VALIDOS.includes(role)){ notifyError('Perfil inválido.'); return; }
  const btn = document.getElementById('usuario-salvar-btn');
  if(btn){ btn.disabled = true; btn.textContent = 'Salvando...'; }
  try{
    if(id){
      const u = db.usuarios.find(x => x.id === id);
      if(!u){ notifyError('Usuário não encontrado.'); return; }
      if(id === window.perfilAtual.uid && role !== 'admin'){
        notifyError('Você não pode remover o seu próprio perfil de administrador.');
        return;
      }
      await Dados.salvarPerfil(id, { nome, email: u.email, role, dataCadastro: u.dataCadastro });
      await logAction('cadastro', 'Usuário editado', `${u.nome}${u.nome !== nome ? ' → ' + nome : ''} · perfil ${role}`);
    } else {
      if(!/^\S+@\S+\.\S+$/.test(email)){ notifyError('Informe um e-mail válido.'); return; }
      if(senha.length < 8){ notifyError('A senha temporária deve ter pelo menos 8 caracteres.'); return; }
      if((db.usuarios || []).some(x => (x.email || '').toLowerCase() === email)){ notifyError('Já existe um usuário com esse e-mail.'); return; }
      const novoUid = await Dados.criarContaAuth(email, senha);
      await Dados.salvarPerfil(novoUid, { nome, email, role, dataCadastro: todayISO() });
      await logAction('cadastro', 'Novo usuário criado', `${nome} · perfil ${role}`);
    }
    closeModal('modal-usuario');
    notifySuccess('Usuário salvo com sucesso.');
    renderAll();
  } catch(e){
    console.error(e);
    notifyError('Não foi possível salvar o usuário. Verifique os dados e suas permissões.');
  } finally {
    if(btn){btn.disabled=false;btn.textContent='Salvar';}
  }
}

async function redefinirSenhaUsuario(){
  if(!podeGerenciarUsuarios()) return;
  const u = (db.usuarios || []).find(x => x.id === document.getElementById('usuario-id').value);
  if(!u) return;
  try{
    await Dados.enviarRedefinicaoSenha(u.email);
    await logAction('cadastro', 'Redefinição de senha enviada', u.nome);
    notifySuccess(Dados.modo === 'demo'
      ? 'Modo demonstração: nenhum e-mail é enviado.'
      : `Link de redefinição enviado para ${u.email}.`);
  } catch(e){
    notifyError('Não foi possível enviar o link de redefinição.');
  }
}

function deleteUsuario(id){
  if(!podeGerenciarUsuarios()) return;
  const u = (db.usuarios || []).find(x => x.id === id);
  if(!u) return;
  if(id === window.perfilAtual.uid){
    notifyError('Você não pode excluir o próprio usuário. Peça a outro administrador.');
    return;
  }
  showConfirm(`Excluir o usuário "${u.nome}"? O perfil é removido e o acesso ao sistema é bloqueado imediatamente (as regras exigem perfil). O histórico no log é mantido. A conta de autenticação pode ser removida depois no console do Firebase.`, async () => {
    try{
      await Dados.removerPerfil(id);
      await logAction('exclusao', 'Usuário excluído', u.nome);
      notifySuccess('Usuário excluído.');
    } catch(e){ notifyError('Não foi possível excluir o usuário.'); }
    closeModal('modal-confirm');
    renderAll();
  });
}



// Fonte: src/features/estoque/ui.js










function openPecaModal(id){
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
function savePeca(){
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

let comboItens = {};
function comboAbrir(prefix){
  comboFiltro(prefix);
}
function comboFiltro(prefix){
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
function comboSelecionar(prefix, id){
  const items = comboItens[prefix] || [];
  const p = items.find(x=>x.id===id);
  if(!p) return;
  document.getElementById(prefix+'-peca').value = id;
  document.getElementById(prefix+'-peca-search').value = `${p.nome}${p.codigo?' ('+p.codigo+')':''}`;
  document.getElementById(prefix+'-peca-dropdown').classList.remove('open');
  if(prefix==='baixa') atualizarBaixaEstoqueInfo();
}
function comboFechar(prefix){
  setTimeout(()=>{ const d = document.getElementById(prefix+'-peca-dropdown'); if(d) d.classList.remove('open'); }, 150);
}
function comboLimpar(prefix){
  document.getElementById(prefix+'-peca').value = '';
  document.getElementById(prefix+'-peca-search').value = '';
  const d = document.getElementById(prefix+'-peca-dropdown');
  d.innerHTML = '';
  d.classList.remove('open');
}

function openEntradaModal(){
  comboItens['entrada'] = [...db.pecas].sort((a,b)=>a.nome.localeCompare(b.nome));
  comboLimpar('entrada');
  document.getElementById('entrada-quantidade').value = 1;
  document.getElementById('entrada-valor').value = '';
  document.getElementById('entrada-data').value = todayISO();
  openModal('modal-entrada');
}
function salvarEntrada(){
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
function deletePeca(id){
  const p = db.pecas.find(x=>x.id===id);
  showConfirm('Excluir esta peça do estoque? Essa ação não pode ser desfeita.', ()=>{
    db.pecas = db.pecas.filter(x=>x.id!==id);
    saveDB();
    logAction('exclusao', 'Peça excluída', p ? `${p.nome}${p.codigo?' ('+p.codigo+')':''}` : id);
    closeModal('modal-confirm');
    renderAll();
  });
}
function renderCatTabs(){
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
function filtrarEstoque(){
  const search = (document.getElementById('search-pecas').value||'').toLowerCase();
  const statusF = document.getElementById('filter-status-peca').value;
  return db.pecas.filter(p=>{
    if(uiState.estoqueCatFiltro && p.categoria!==uiState.estoqueCatFiltro) return false;
    if(statusF && p.status!==statusF) return false;
    if(search && !(p.nome.toLowerCase().includes(search) || (p.codigo||'').toLowerCase().includes(search) || (p.local||'').toLowerCase().includes(search))) return false;
    return true;
  }).sort((a,b)=>a.nome.localeCompare(b.nome));
}
function renderEstoque(){
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

const debouncedRenderCurvaA = debounce(()=>{ uiState.curvaPagina = 1; renderCurvaA(); }, 250);

function openMoverCurvaAModal(id){
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
function moverParaCurvaA(){
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
function devolverDaCurvaA(id){
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
function deleteCurvaA(id){
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
function renderCurvaA(){
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



// Fonte: src/features/fornecedores/ui.js






function openFornecedorModal(id){
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
function saveFornecedor(){
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
function deleteFornecedor(id){
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
function renderFornecedores(){
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



// Fonte: src/features/reformas/ui.js








function atualizarStatusEnvioPeca(pecaId){
  const peca = db.pecas.find(p => p.id === pecaId);
  if(!peca) return;
  const existeAberto = db.envios.some(e => e.pecaId === pecaId && e.status !== 'Retornado');
  if(existeAberto) peca.status = 'Em Reforma';
  else if(peca.status === 'Em Reforma') peca.status = 'Disponível';
}
function populateEnvioSelects(){
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
function openEnvioModal(id){
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
function saveEnvio(){
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
function registrarRetorno(id){
  const e = db.envios.find(x=>x.id===id);
  if(!e) return;
  e.status = 'Retornado';
  e.dataRetorno = todayISO();
  atualizarStatusEnvioPeca(e.pecaId);
  saveDB();
  logAction('retorno', 'Retorno de reforma registrado', `${pecaNome(e.pecaId)} de ${fornNome(e.fornecedorId)}`);
  renderAll();
}
function deleteEnvio(id){
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
function pecaNome(id){ const p = db.pecas.find(x=>x.id===id) || (db.curvaA||[]).find(c=>c.origemId===id); return p ? p.nome : '(peça removida)'; }
function fornNome(id){ const f = db.fornecedores.find(x=>x.id===id); return f ? f.nome : '(fornecedor removido)'; }

function renderEnvios(){
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



// Fonte: src/features/baixas/ui.js













function populateBaixaPecaCombo(){
  comboItens['baixa'] = [...db.pecas].filter(p=>p.status!=='Baixa').sort((a,b)=>a.nome.localeCompare(b.nome));
}
function atualizarBaixaEstoqueInfo(){
  const info = document.getElementById('baixa-peca-estoque-info');
  const p = db.pecas.find(x=>x.id===document.getElementById('baixa-peca').value);
  info.textContent = p ? `Estoque atual: ${p.quantidade} ${p.unidade||'un'}` : '';
}
function openBaixaModal(id){
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
async function saveBaixa(){
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
function deleteBaixa(id){
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
let baixasExpandedCodigos = new Set();
let ultimoGruposCodigoKeys = [];
function toggleBaixaCodigo(codigo){
  if(baixasExpandedCodigos.has(codigo)) baixasExpandedCodigos.delete(codigo);
  else baixasExpandedCodigos.add(codigo);
  renderBaixas();
}
function expandirTodosCodigos(){
  ultimoGruposCodigoKeys.forEach(c=> baixasExpandedCodigos.add(c));
  renderBaixas();
}
function recolherTodosCodigos(){
  baixasExpandedCodigos.clear();
  renderBaixas();
}
function filtrarBaixas(){
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
function renderBaixas(){
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



// Fonte: src/features/dashboard/ui.js





function statCard(label, value, sub){
  return `<div class="stat-card"><div class="stat-label">${escapeHtml(label)}</div><div class="stat-value${String(value).startsWith('R$') ? ' stat-value-money' : ''}">${escapeHtml(value)}</div>${sub?`<div class="stat-sub">${escapeHtml(sub)}</div>`:''}</div>`;
}
function renderDashboard(){
  const totalPecas = db.pecas.length;
  const valorEstoque = db.pecas.reduce((s,p)=>s+custoMedioPeca(p)*(Number(p.quantidade)||0),0);
  const baixoEstoque = db.pecas.filter(p=>p.quantidade<=p.minimo && p.status!=='Baixa');
  const emReforma = db.pecas.filter(p=>p.status==='Em Reforma').length;
  const enviosAbertos = db.envios.filter(e=>e.status!=='Retornado').length;
  const mediaEnvio = db.envios.length ? db.envios.reduce((s,e)=>s+(Number(e.valor)||0),0)/db.envios.length : 0;

  document.getElementById('dash-stats').innerHTML = `
    ${statCard('Peças Cadastradas', totalPecas, '')}
    ${statCard('Valor em Estoque', fmtMoney(valorEstoque), '')}
    ${statCard('Abaixo do Mínimo', baixoEstoque.length, 'itens precisam de reposição')}
    ${statCard('Em Reforma', emReforma, 'peças fora do estoque')}
    ${statCard('Envios em Aberto', enviosAbertos, '')}
    ${statCard('Custo Médio / Envio', fmtMoney(mediaEnvio), '')}
  `;

  const bannerEl = document.getElementById('dash-low-banner');
  if(baixoEstoque.length){
    bannerEl.innerHTML = `<div class="low-stock-banner" onclick="goPage('estoque')">
      <div class="low-stock-count">${baixoEstoque.length}</div>
      <div><div class="low-stock-text">peça(s) com estoque igual ou abaixo do mínimo</div><div class="low-stock-sub">Clique para ver os itens no estoque</div></div>
      <span style="margin-left:auto;font-size:18px">→</span>
    </div>`;
  } else { bannerEl.innerHTML=''; }

  const abertos = db.envios.filter(e=>e.status!=='Retornado').sort((a,b)=>(a.dataEnvio||'').localeCompare(b.dataEnvio||''));
  const abertosWrap = document.getElementById('dash-envios-abertos');
  if(!abertos.length){
    abertosWrap.innerHTML = `<div class="empty-state" style="padding:24px;"><div class="empty-icon" style="font-size:28px;">✅</div><div class="empty-sub">Nenhum envio pendente de retorno.</div></div>`;
  } else {
    abertosWrap.innerHTML = abertos.slice(0,6).map(e=>`
      <div class="link-row" style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--dark);border-radius:8px;border:1px solid var(--border);margin-bottom:6px;">
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:600;">${escapeHtml(pecaNome(e.pecaId))}</div>
          <div style="font-size:11px;color:var(--muted);">${escapeHtml(fornNome(e.fornecedorId))} · enviado em ${fmtDate(e.dataEnvio)}</div>
        </div>
        <span class="badge ${TIPO_ENVIO_BADGE[e.tipo]||'badge-gray'}">${escapeHtml(e.tipo)}</span>
        <button class="btn btn-retorno btn-sm" onclick="registrarRetorno(${jsArg(e.id)})">Retorno</button>
      </div>`).join('');
  }

  const catCounts = CATEGORIAS.map(c=>({cat:c,count:db.pecas.filter(p=>p.categoria===c).length}));
  const maxCount = Math.max(1,...catCounts.map(c=>c.count));
  document.getElementById('dash-cat-chart').innerHTML = `<div class="chart-bar-wrap">${catCounts.map(c=>`
    <div class="chart-bar-col">
      <div class="chart-bar-val">${c.count}</div>
      <div class="chart-bar" style="height:${Math.max(4,(c.count/maxCount)*100)}px;background:${CAT_BAR[c.cat]};"></div>
      <div class="chart-bar-label">${c.cat}</div>
    </div>`).join('')}</div>`;
}

function renderRelatorios(){
  const mesFiltro = document.getElementById('rel-mes').value; // formato YYYY-MM
  const enviosFiltrados = mesFiltro ? db.envios.filter(e=>(e.dataEnvio||'').slice(0,7)===mesFiltro) : db.envios;

  const retornados = enviosFiltrados.filter(e=>e.status==='Retornado');
  const totalGasto = enviosFiltrados.reduce((s,e)=>s+(Number(e.valor)||0),0);
  const mediaGeral = enviosFiltrados.length ? totalGasto/enviosFiltrados.length : 0;
  const valorEstoque = db.pecas.reduce((s,p)=>s+custoMedioPeca(p)*(Number(p.quantidade)||0),0);
  document.getElementById('rel-stats').innerHTML = `
    ${statCard(mesFiltro?'Gasto no Período':'Total Gasto em Envios', fmtMoney(totalGasto), mesFiltro?mesFiltro:'')}
    ${statCard('Custo Médio', fmtMoney(mediaGeral), 'por envio')}
    ${statCard('Reformas Concluídas', retornados.length, '')}
    ${statCard('Valor Total em Estoque', fmtMoney(valorEstoque), 'independe do período')}
  `;

  const tipos = ['Reforma','Conserto','Garantia'];
  const tipoData = tipos.map(t=>{
    const envs = enviosFiltrados.filter(e=>e.tipo===t);
    const media = envs.length ? envs.reduce((s,e)=>s+(Number(e.valor)||0),0)/envs.length : 0;
    return {tipo:t, media, count:envs.length};
  });
  const maxMedia = Math.max(1,...tipoData.map(t=>t.media));
  document.getElementById('rel-tipo-chart').innerHTML = `<div class="chart-bar-wrap">${tipoData.map(t=>`
    <div class="chart-bar-col">
      <div class="chart-bar-val">${fmtMoney(t.media)}</div>
      <div class="chart-bar" style="height:${Math.max(4,(t.media/maxMedia)*100)}px;background:${TIPO_ENVIO_BADGE[t.tipo]==='badge-purple'?'var(--purple)':(TIPO_ENVIO_BADGE[t.tipo]==='badge-blue'?'var(--blue)':'var(--green)')};"></div>
      <div class="chart-bar-label">${t.tipo} (${t.count})</div>
    </div>`).join('')}</div>`;

  const catValor = CATEGORIAS.map(c=>{
    const v = db.pecas.filter(p=>p.categoria===c).reduce((s,p)=>s+custoMedioPeca(p)*(Number(p.quantidade)||0),0);
    return {cat:c, valor:v};
  });
  const maxCatValor = Math.max(1,...catValor.map(c=>c.valor));
  document.getElementById('rel-cat-valor-chart').innerHTML = `<div class="chart-bar-wrap">${catValor.map(c=>`
    <div class="chart-bar-col">
      <div class="chart-bar-val">${fmtMoney(c.valor)}</div>
      <div class="chart-bar" style="height:${Math.max(4,(c.valor/maxCatValor)*100)}px;background:${CAT_BAR[c.cat]};"></div>
      <div class="chart-bar-label">${c.cat}</div>
    </div>`).join('')}</div>`;

  const ranking = db.fornecedores.map(f=>{
    const envs = enviosFiltrados.filter(e=>e.fornecedorId===f.id);
    const total = envs.reduce((s,e)=>s+(Number(e.valor)||0),0);
    const media = envs.length ? total/envs.length : 0;
    const pendentes = envs.filter(e=>e.status!=='Retornado').length;
    return {nome:f.nome, count:envs.length, total, media, pendentes};
  }).sort((a,b)=>b.total-a.total);
  const tbody = document.getElementById('rel-forn-tbody');
  if(!ranking.length){
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:24px;">Nenhum fornecedor com envios registrados ainda.</td></tr>`;
  } else {
    tbody.innerHTML = ranking.map(r=>`<tr>
      <td><strong>${escapeHtml(r.nome)}</strong></td>
      <td>${r.count}</td>
      <td>${fmtMoney(r.total)}</td>
      <td>${fmtMoney(r.media)}</td>
      <td>${r.pendentes ? `<span class="badge badge-purple">${r.pendentes}</span>` : '—'}</td>
    </tr>`).join('');
  }
}



// Fonte: src/features/exportacao/ui.js







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



// Fonte: src/core/app.js











const debouncedRenderEstoque = debounce(() => { uiState.estoquePagina = 1; renderEstoque(); }, 250);
const debouncedRenderEnvios = debounce(renderEnvios, 250);
const debouncedRenderBaixas = debounce(() => { uiState.baixasPagina = 1; renderBaixas(); }, 250);
const debouncedRenderFornecedores = debounce(renderFornecedores, 250);
const debouncedRenderLog = debounce(renderLog, 250);
const debouncedRenderUsuarios = debounce(renderUsuarios, 250);

function goPage(page){
  if((page === 'log' && !podeVerLog()) || (page === 'usuarios' && !podeGerenciarUsuarios())){
    page = 'dashboard';
  }
  document.querySelectorAll('[id^="page-"]').forEach(el => el.style.display = 'none');
  document.getElementById('page-' + page).style.display = '';
  document.querySelectorAll('.nav-item').forEach(el => {
    const ativo = el.dataset.page === page;
    el.classList.toggle('active', ativo);
    if(ativo) el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
  });
  uiState.paginaAtual = page;
  closeSidebarMobile();
  renderAll();
}

function atualizarAcessoLog(){
  document.getElementById('nav-log').style.display = podeVerLog() ? '' : 'none';
  document.getElementById('nav-usuarios').style.display = podeGerenciarUsuarios() ? '' : 'none';
  document.getElementById('nav-label-auditoria').style.display = (podeVerLog() || podeGerenciarUsuarios()) ? '' : 'none';
}

function toggleSidebar(){
  const menu = document.getElementById('sidebar');
  const aberto = menu.classList.toggle('mobile-open');
  document.getElementById('sidebar-overlay').classList.toggle('open', aberto);
  document.querySelectorAll('.mobile-menu-btn').forEach(btn => btn.setAttribute('aria-expanded', String(aberto)));
  if(aberto) menu.querySelector('.nav-item').focus();
}
function closeSidebarMobile(){
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('sidebar-overlay').classList.remove('open');
  document.querySelectorAll('.mobile-menu-btn').forEach(btn => btn.setAttribute('aria-expanded', 'false'));
}

function renderAll(){
  if(!window.perfilAtual) return;
  atualizarAcessoLog();
  renderDashboard();
  switch(uiState.paginaAtual){
    case 'estoque': renderCatTabs(); renderEstoque(); break;
    case 'curvaa': renderCurvaA(); break;
    case 'reformas': renderEnvios(); break;
    case 'baixas': renderBaixas(); break;
    case 'fornecedores': renderFornecedores(); break;
    case 'relatorios': renderRelatorios(); break;
    case 'log': renderLog(); break;
    case 'usuarios': renderUsuarios(); break;
  }
}

Dados.iniciar();
Dados.aoMudarAutenticacao(aoMudarSessao);


window.uiState = uiState;
window.__appReady = true;
