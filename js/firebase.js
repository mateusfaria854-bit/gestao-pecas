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
