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
