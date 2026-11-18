from pathlib import Path
import os, re
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
scripts = ['js/firebase-config.js','data/demo-data.js','js/utils.js','js/firebase.js',
           'js/manutencao.js','js/auth.js','js/auditoria.js','js/usuarios.js',
           'js/estoque.js','js/fornecedores.js','js/reformas.js','js/baixas.js',
           'js/dashboard.js','js/exportacao.js','js/app.js']
html = (root/'index.html').read_text(encoding='utf-8')
html = re.sub(r'<script\b[^>]*>.*?</script>', '', html, flags=re.I | re.S)
html = re.sub(r'<link[^>]*stylesheet[^>]*>', '', html, flags=re.I | re.S)

testes = []
def assert_ok(cond, label):
    if not cond: raise AssertionError(label)
    testes.append(label)
    print('PASS', label)

with sync_playwright() as pw:
    chromium_bin = os.environ.get('CHROMIUM_BIN') or ('/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None)
    browser = pw.chromium.launch(headless=True, executable_path=chromium_bin, args=['--no-sandbox','--no-proxy-server'])
    page = browser.new_page(viewport={'width':1440,'height':920}, accept_downloads=True)
    errors = []
    page.on('pageerror', lambda exc: errors.append(str(exc)))
    page.set_content(html)
    for path in ('css/style.css','css/components.css'):
        page.add_style_tag(content=re.sub(r'(?m)^\s*@import[^\n]*\n', '', (root/path).read_text(encoding='utf-8')))
    for path in scripts:
        page.add_script_tag(content=(root/path).read_text(encoding='utf-8'))
    page.evaluate('loginDemo()')
    page.wait_for_timeout(100)

    # Real browser download, with current search filter applied.
    page.get_by_role('button', name='Peças em Estoque').click()
    page.locator('#search-pecas').fill('Filtro de óleo')
    page.wait_for_timeout(350)
    with page.expect_download() as info:
        page.locator('#page-estoque').get_by_role('button', name='Exportar CSV').click()
    dl = info.value
    csv = Path(dl.path()).read_text(encoding='utf-8-sig')
    assert_ok(dl.suggested_filename == 'gestaopecas-estoque.csv','Download de estoque com nome esperado')
    assert_ok('Filtro de óleo' in csv and 'Filtro de ar' not in csv, 'Exportação de estoque respeita a busca')
    assert_ok(csv.startswith('"Código";"Peça"'), 'Cabeçalhos em CSV UTF-8')

    page.get_by_role('button', name='Baixas para Ônibus').click()
    page.locator('#search-baixas-frota').fill('102')
    page.wait_for_timeout(350)
    exp = page.evaluate("filtrarBaixas().length")
    with page.expect_download() as info:
        page.locator('#page-baixas').get_by_role('button', name='Exportar CSV').click()
    csv = Path(info.value.path()).read_text(encoding='utf-8-sig').splitlines()
    assert_ok(len(csv)-1 == exp,'Exportação de baixas respeita o filtro do ônibus')

    page.get_by_role('button', name='Relatórios').click()
    with page.expect_download() as info:
        page.get_by_role('button', name='Envios CSV').click()
    assert_ok(info.value.suggested_filename.startswith('gestaopecas-envios'), 'Exportação CSV de envios')
    with page.expect_download() as info:
        page.get_by_role('button', name='Fornecedores CSV').click()
    assert_ok(info.value.suggested_filename.startswith('gestaopecas-fornecedores'), 'Exportação CSV do ranking')

    # CSV spreadsheet injection guard and notifications.
    sample=page.evaluate("celulaCsv('=HYPERLINK(\"https://example.com\")')")
    assert_ok(sample.startswith('"\'='), 'Campos de texto não viram fórmulas CSV')
    page.evaluate("notifyError('Teste de quantidade inválida')")
    assert_ok(page.get_by_role('alert').filter(has_text='Teste de quantidade inválida').count()==1,
              'Erros aparecem em notificação acessível')
    page.evaluate("notifySuccess('Registro atualizado')")
    assert_ok(page.get_by_role('status').filter(has_text='Registro atualizado').count()==1,
              'Sucesso aparece em notificação não bloqueante')

    # Keyboard-first navigation and focus recovery.
    page.get_by_role('button', name='Peças em Estoque').focus()
    page.keyboard.press('Enter')
    assert_ok(page.locator('#page-estoque').is_visible(), 'Navegação pelo menu com Enter')
    assert_ok(page.get_by_role('button', name='Peças em Estoque').get_attribute('aria-current')=='page',
              'Menu ativo indica página para leitores de tela')
    page.locator('#page-estoque').get_by_role('button', name='Nova Peça').click()
    assert_ok(page.get_by_role('dialog',name='Nova Peça').is_visible(), 'Modal com nome acessível')
    assert_ok(page.locator('label[for="peca-nome"]').count()==1, 'Label da peça associada ao campo')
    page.keyboard.press('Escape')
    assert_ok(not page.locator('#modal-peca').is_visible(), 'Escape fecha o modal')
    assert_ok(page.evaluate('document.activeElement?.textContent?.includes("Nova Peça")'), 'Foco retorna ao botão anterior')

    # Simulate failed backend write and ensure the last committed marker stays unchanged.
    result = page.evaluate('''async () => {
      const antigo = _ultimoSalvo.pecas;
      db.pecas[0].nome = 'Falha controlada de teste';
      const original = Dados.salvarColecao;
      Dados.salvarColecao = async () => { throw new Error('Falha simulada'); };
      const falhou = await saveDB();
      const naoConfirmado = _ultimoSalvo.pecas === antigo;
      Dados.salvarColecao = original;
      const recuperou = await saveDB();
      return {falhou, naoConfirmado, recuperou};
    }''')
    assert_ok(result=={'falhou':False,'naoConfirmado':True,'recuperou':True}, 'Erro de escrita não confirma salvamento e permite repetir')
    assert_ok(not errors, 'Sem erros JavaScript durante os novos testes')
    browser.close()
print(f'RESULTADO: {len(testes)} / {len(testes)} verificações de melhoria aprovadas')
