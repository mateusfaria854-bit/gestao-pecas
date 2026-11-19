import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Ordem explícita apenas do bundle compatível com os eventos existentes no HTML.
const ordem = [
  'src/core/state.js',
  'src/domain/stock.js', 'src/domain/baixas.js', 'src/domain/csv.js',
  'src/utils/helpers.js', 'src/components/modal.js', 'src/components/notifications.js',
  'src/services/data-store.js', 'src/services/maintenance.js',
  'src/features/auth/ui.js', 'src/features/auditoria/ui.js',
  'src/features/usuarios/ui.js', 'src/features/estoque/ui.js',
  'src/features/fornecedores/ui.js', 'src/features/reformas/ui.js',
  'src/features/baixas/ui.js', 'src/features/dashboard/ui.js',
  'src/features/exportacao/ui.js', 'src/core/app.js'
];
const resultado = ordem.map(caminho => {
  const codigo = readFileSync(resolve(root, caminho), 'utf8')
    .replace(/^import\s+\{[^}]+\}\s+from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^export\s+(?=(?:async\s+)?function|const|let|var)\b/gm, '');
  if (/^\s*(?:import|export)\s/m.test(codigo)) throw new Error('Importação ES não convertida: '+caminho);
  return '\n// Fonte: '+caminho+'\n'+codigo+'\n';
}).join('\n');
mkdirSync(resolve(root,'dist'),{recursive:true});
writeFileSync(resolve(root,'dist/app.js'),'/* Bundle gerado por npm run build. Edite os arquivos em src/. */\n'+resultado+'\nwindow.uiState = uiState;\nwindow.__appReady = true;\n');
console.log('dist/app.js gerado a partir de',ordem.length,'módulos.');
