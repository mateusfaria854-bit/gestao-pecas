import { escapeHtml, fmtDate, jsArg, normalizarNome, todayISO, uid } from '../../utils/helpers.js';
import { Dados, PERFIS_VALIDOS, db } from '../../services/data-store.js';
import { podeGerenciarUsuarios } from '../auth/ui.js';
import { logAction } from '../auditoria/ui.js';
import { renderAll } from '../../core/app.js';
import { closeModal, openModal, showConfirm } from '../../components/modal.js';
import { notifyError, notifySuccess } from '../../components/notifications.js';

/* Perfis são protegidos pelas Security Rules no modo Firebase. */
export function renderUsuarios(){
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

export function openUsuarioModal(id){
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

export async function salvarUsuario(){
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

export async function redefinirSenhaUsuario(){
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

export function deleteUsuario(id){
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
