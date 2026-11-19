

export const focoAntesModal = new Map();
export function openModal(id){
  const modal = document.getElementById(id);
  if(!modal) return;
  focoAntesModal.set(id, document.activeElement);
  modal.classList.add('open');
  const primeiro = modal.querySelector('input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled)');
  if(primeiro) primeiro.focus({ preventScroll:true });
}
export function closeModal(id){
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

export function showConfirm(msg, onConfirm){
  document.getElementById('confirm-msg').textContent = msg;
  const btn = document.getElementById('confirm-btn');
  btn.onclick = onConfirm;
  openModal('modal-confirm');
}

