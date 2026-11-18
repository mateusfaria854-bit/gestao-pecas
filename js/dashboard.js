
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

