import { APP_CONFIG, Dados } from './data-store.js';

/* Na demonstração, a validação de OS usa os registros fictícios de data/demo-data.json. */
export let _osSimuladas = null;

export async function carregarOSSimuladas(){
  if(_osSimuladas) return _osSimuladas;
  if(window.DEMO_DATA){ _osSimuladas = window.DEMO_DATA.ordensServico || []; return _osSimuladas; }
  const resp = await fetch('data/demo-data.json');
  if(!resp.ok) throw new Error('Dados de demonstração indisponíveis.');
  _osSimuladas = (await resp.json()).ordensServico || [];
  return _osSimuladas;
}

export function normalizarCodigoVeiculo(v){
  return String(v ?? '').trim().replace(/^0+/, '');
}

export async function verificarOSAbertaManutencao(codigoVeiculo){
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
