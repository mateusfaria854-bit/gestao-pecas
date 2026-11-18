
const debouncedRenderEstoque = debounce(() => { estoquePagina = 1; renderEstoque(); }, 250);
const debouncedRenderEnvios = debounce(renderEnvios, 250);
const debouncedRenderBaixas = debounce(() => { baixasPagina = 1; renderBaixas(); }, 250);
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
  paginaAtual = page;
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
  switch(paginaAtual){
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
