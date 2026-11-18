from pathlib import Path
import re,json,os
from playwright.sync_api import sync_playwright
root = Path(__file__).resolve().parents[1]
scripts=['js/firebase-config.js','data/demo-data.js','js/utils.js','js/firebase.js','js/manutencao.js','js/auth.js','js/auditoria.js','js/usuarios.js','js/estoque.js','js/fornecedores.js','js/reformas.js','js/baixas.js','js/dashboard.js','js/exportacao.js','js/app.js']
html=(root/'index.html').read_text()
html=re.sub(r'<script\b[^>]*>.*?</script>','',html,flags=re.I|re.S)
html=re.sub(r'<link[^>]*stylesheet[^>]*>','',html,flags=re.I|re.S)
checks=[]
def ok(label,cond):
  checks.append([label, bool(cond)])
  print(('PASS ' if cond else 'FAIL ')+label)
  if not cond: raise AssertionError(label)
with sync_playwright() as pw:
  chromium_bin = os.environ.get('CHROMIUM_BIN') or ('/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None)
  browser=pw.chromium.launch(headless=True,executable_path=chromium_bin,args=['--no-sandbox','--no-proxy-server'])
  page=browser.new_page(viewport={'width':1440,'height':920})
  js_errors=[]; alerts=[]
  page.on('pageerror', lambda exc: js_errors.append(str(exc)))
  page.on('dialog', lambda d: (alerts.append(d.message),d.accept()))
  page.set_content(html)
  for f in ['css/style.css','css/components.css']:
    page.add_style_tag(content=re.sub(r'(?m)^\s*@import[^\n]*\n', '', (root/f).read_text()))
  for f in scripts: page.add_script_tag(content=(root/f).read_text())
  page.evaluate('loginDemo()');page.wait_for_timeout(100)
  ok('Login demo sem erro de JavaScript',page.evaluate('window.perfilAtual?.role')=='admin')
  expr="({a:db.pecas.find(p=>p.id==='peca-001').quantidade,b:db.pecas.find(p=>p.id==='peca-002').quantidade,n:db.baixas.length})"
  first=page.evaluate(expr)
  asyncbaixa = '''async (peca,qtd,status,id='')=>{
    if(id) openBaixaModal(id); else openBaixaModal();
    document.getElementById('baixa-peca').value=peca;
    document.getElementById('baixa-onibus').value='101';
    document.getElementById('baixa-qtd').value=String(qtd);
    document.getElementById('baixa-status').value=status;
    await saveBaixa();
  }'''
  page.evaluate('(' + asyncbaixa + ")('peca-001',-5,'Realizado')")
  ok('Quantidade negativa não cria baixa',page.evaluate(expr)==first)
  page.evaluate('(' + asyncbaixa + ")('peca-001',999,'Realizado')")
  ok('Quantidade acima do saldo não é aceita',page.evaluate(expr)==first)
  page.evaluate('(' + asyncbaixa + ")('peca-001',2,'Realizado')")
  page.wait_for_timeout(80)
  mid=page.evaluate(expr)
  ok('Baixa válida desconta 2 unidades',mid['a']==first['a']-2 and mid['n']==first['n']+1)
  bid=page.evaluate('db.baixas.at(-1).id')
  page.evaluate('(' + asyncbaixa + f")('peca-002',1,'Realizado',{json.dumps(bid)})")
  page.wait_for_timeout(80)
  after=page.evaluate(expr)
  ok('Edição troca peça e estorna saldo anterior',after['a']==first['a'] and after['b']==first['b']-1 and after['n']==first['n']+1)
  page.evaluate('(' + asyncbaixa + f")('peca-002',1,'Pendente',{json.dumps(bid)})")
  page.wait_for_timeout(80)
  after2=page.evaluate(expr)
  ok('Mudar para Pendente devolve saldo',after2['a']==first['a'] and after2['b']==first['b'])
  # Entrada: preço negativo
  page.evaluate('''()=>{
    openEntradaModal();document.getElementById('entrada-peca').value='peca-001';
    document.getElementById('entrada-quantidade').value='1';
    document.getElementById('entrada-valor').value='-999';salvarEntrada();
  }''')
  ok('Preço negativo de entrada rejeitado',page.evaluate(expr)['a']==first['a'])
  # cadastro peça: quantidade negativa
  count=page.evaluate('db.pecas.length')
  page.evaluate('''()=>{
    openPecaModal();document.getElementById('peca-nome').value='Teste inválido';
    document.getElementById('peca-quantidade').value='-4';
    document.getElementById('peca-valor').value='100';savePeca();
  }''')
  ok('Cadastro peça com estoque negativo rejeitado',page.evaluate('db.pecas.length')==count)
  # Histórico preservado: valor manual e entrada
  hist=page.evaluate("JSON.stringify(db.pecas.find(p=>p.id==='peca-001').entradas)")
  page.evaluate('''()=>{
    openPecaModal('peca-001');document.getElementById('peca-valor').value='777';savePeca();
  }''')
  ok('Edição de custo não altera entradas históricas',page.evaluate("JSON.stringify(db.pecas.find(p=>p.id==='peca-001').entradas)")==hist)
  ok('Ajuste manual de valor aplicado',page.evaluate("custoMedioPeca(db.pecas.find(p=>p.id==='peca-001'))")==777)
  page.evaluate('''()=>{
    openEntradaModal();document.getElementById('entrada-peca').value='peca-001';
    document.getElementById('entrada-quantidade').value='1';
    document.getElementById('entrada-valor').value='35';salvarEntrada();
  }''')
  page.wait_for_timeout(100)
  ok('Entrada válida limpa ajuste manual',page.evaluate("db.pecas.find(p=>p.id==='peca-001').valorAjustado === undefined"))
  # multi-envios
  setup=page.evaluate('''()=>{
    const p=db.pecas.find(p=>!db.envios.some(e=>e.pecaId===p.id));
    if(!p) return null;
    return {p:p.id,f:db.fornecedores[0].id};
  }''')
  ok('Há peça livre para testar envios',bool(setup))
  for i in range(2):
    page.evaluate('''({pecaId,fornecedorId})=>{
      openEnvioModal();document.getElementById('envio-peca').value=pecaId;
      document.getElementById('envio-fornecedor').value=fornecedorId;
      document.getElementById('envio-valor').value='300';saveEnvio();
    }''', {'pecaId':setup['p'],'fornecedorId':setup['f']})
  ok('Dois envios colocam peça em reforma',page.evaluate('(id)=>db.pecas.find(p=>p.id===id).status',setup['p'])=='Em Reforma')
  envios=page.evaluate('(id)=>db.envios.filter(e=>e.pecaId===id).map(e=>e.id)',setup['p'])
  page.evaluate('(id)=>registrarRetorno(id)',envios[0])
  ok('Retorno parcial mantém Em Reforma',page.evaluate('(id)=>db.pecas.find(p=>p.id===id).status',setup['p'])=='Em Reforma')
  page.evaluate('(id)=>registrarRetorno(id)',envios[1])
  ok('Último retorno marca Disponível',page.evaluate('(id)=>db.pecas.find(p=>p.id===id).status',setup['p'])=='Disponível')
  current=page.evaluate('db.envios.length')
  page.evaluate('''()=>{
    openEnvioModal();document.getElementById('envio-peca').value='peca-001';
    document.getElementById('envio-fornecedor').value=db.fornecedores[0].id;
    document.getElementById('envio-valor').value='-500';saveEnvio();
  }''')
  ok('Preço de envio negativo rejeitado',page.evaluate('db.envios.length')==current)
  # XSS cases
  page.evaluate('''()=>{
    window.__xss=0;
    const payload='<img src=x onerror="window.__xss=1">';
    db.logs.push({id:'evil',tipo:payload,usuario:'test',titulo:'test',detalhes:'test',timestamp:new Date().toISOString()});
    db.fornecedores.push({id:'attacker-test',nome:'Fornecedor seguro',especialidade:payload});
    db.baixas.push({id:'xb',onibus:payload,pecaId:'peca-001',statusBaixa:'Pendente',quantidade:1,data:todayISO()});
    renderLog();renderFornecedores();renderBaixas();
  }''')
  page.wait_for_timeout(150)
  ok('Campos maliciosos não executam JavaScript',page.evaluate('window.__xss')==0)
  page.evaluate('goPage("dashboard")')
  ok('Nenhum erro JS nos cenários',not js_errors)
  # Mobile layout
  page.set_viewport_size({'width':390,'height':844})
  page.evaluate('goPage("dashboard")')
  page.wait_for_timeout(100)
  dim=page.evaluate('''()=>({w:document.documentElement.clientWidth, col:document.getElementById('dash-cols').getBoundingClientRect().width, parent:document.getElementById('dash-cols').parentElement.getBoundingClientRect().width})''')
  ok('Grid dashboard em largura mobile',dim['col']<=dim['parent']+2)
  page.evaluate('goPage("relatorios")')
  dim=page.evaluate('''()=>({w:document.documentElement.clientWidth, col:document.getElementById('rel-cols').getBoundingClientRect().width, parent:document.getElementById('rel-cols').parentElement.getBoundingClientRect().width})''')
  ok('Grid relatórios em largura mobile',dim['col']<=dim['parent']+2)
  browser.close()
print(f"RESULTADO: {sum(1 for _,v in checks if v)} / {len(checks)} testes aprovados")
