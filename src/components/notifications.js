

export function notificar(mensagem, tipo='sucesso'){
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
export function notifyError(mensagem){ notificar(mensagem,'erro'); }
export function notifySuccess(mensagem){ notificar(mensagem,'sucesso'); }
