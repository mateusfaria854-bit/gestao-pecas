import { debounce } from '../utils/helpers.js';
import { Dados } from '../services/data-store.js';
import { aoMudarSessao, podeGerenciarUsuarios, podeVerLog } from '../features/auth/ui.js';
import { renderLog } from '../features/auditoria/ui.js';
import { renderUsuarios } from '../features/usuarios/ui.js';
import { renderCatTabs, renderCurvaA, renderEstoque } from '../features/estoque/ui.js';
import { renderFornecedores } from '../features/fornecedores/ui.js';
import { renderEnvios } from '../features/reformas/ui.js';
import { renderBaixas } from '../features/baixas/ui.js';
import { renderDashboard, renderRelatorios } from '../features/dashboard/ui.js';
import { uiState } from './state.js';

export const debouncedRenderEstoque = debounce(() => { uiState.estoquePagina = 1; renderEstoque(); }, 250);
export const debouncedRenderEnvios = debounce(renderEnvios, 250);
export const debouncedRenderBaixas = debounce(() => { uiState.baixasPagina = 1; renderBaixas(); }, 250);
export const debouncedRenderFornecedores = debounce(renderFornecedores, 250);
export const debouncedRenderLog = debounce(renderLog, 250);
export const debouncedRenderUsuarios = debounce(renderUsuarios, 250);

export function goPage(page){
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

export function atualizarAcessoLog(){
  document.getElementById('nav-log').style.display = podeVerLog() ? '' : 'none';
  document.getElementById('nav-usuarios').style.display = podeGerenciarUsuarios() ? '' : 'none';
  document.getElementById('nav-label-auditoria').style.display = (podeVerLog() || podeGerenciarUsuarios()) ? '' : 'none';
}

export function toggleSidebar(){
  const menu = document.getElementById('sidebar');
  const aberto = menu.classList.toggle('mobile-open');
  document.getElementById('sidebar-overlay').classList.toggle('open', aberto);
  document.querySelectorAll('.mobile-menu-btn').forEach(btn => btn.setAttribute('aria-expanded', String(aberto)));
  if(aberto) menu.querySelector('.nav-item').focus();
}
export function closeSidebarMobile(){
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('sidebar-overlay').classList.remove('open');
  document.querySelectorAll('.mobile-menu-btn').forEach(btn => btn.setAttribute('aria-expanded', 'false'));
}

export function renderAll(){
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
