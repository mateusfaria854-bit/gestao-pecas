import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, cpSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSpecSet } from '../../scripts/spec-check.mjs';
import { createSpec } from '../../scripts/spec-new.mjs';
import { checkDomainBoundaries } from '../../scripts/arch-check.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const fixture = run => {
  const root = mkdtempSync(join(tmpdir(), 'gestaosdd-'));
  const specs = join(root, 'specs');
  mkdirSync(specs);
  cpSync(join(projectRoot, 'specs/_templates'), join(specs, '_templates'), { recursive: true });
  try { return run(root); } finally { rmSync(root, { recursive: true, force: true }); }
};
const edit = (file, replacement) => writeFileSync(file, replacement(readFileSync(file, 'utf8')));

test('gerador cria três arquivos e incrementa IDs sem sobrescrever pastas', () => fixture(root => {
  const first = createSpec(root, 'Importação de planilhas');
  const second = createSpec(root, 'Relatórios PDF');
  assert.equal(first.id, '001');
  assert.equal(second.id, '002');
  assert.match(first.path, /001-importacao-de-planilhas$/);
  for (const f of ['spec.md', 'plan.md', 'tasks.md']) assert.match(readFileSync(join(first.path, f), 'utf8'), /001|AC-001/);
  assert.deepEqual(validateSpecSet(root).errors, []);
}));

test('gerador rejeita nome vazio', () => fixture(root => {
  assert.throws(() => createSpec(root, '   '), /Informe o nome/);
}));

test('validador identifica arquivo obrigatório ausente', () => fixture(root => {
  const dir = createSpec(root, 'Teste');
  rmSync(join(dir.path, 'plan.md'));
  assert.ok(validateSpecSet(root).errors.some(x => x.includes('falta plan.md')));
}));

test('validador identifica critério duplicado', () => fixture(root => {
  const dir = createSpec(root, 'Teste');
  edit(join(dir.path, 'spec.md'), s => s.replace('## Restrições', '- **AC-001:** Critério repetido.\n\n## Restrições'));
  assert.ok(validateSpecSet(root).errors.some(x => x.includes('critério AC-001 duplicado')));
}));

test('validador impede tarefa ligada a AC inexistente', () => fixture(root => {
  const dir = createSpec(root, 'Teste');
  edit(join(dir.path, 'tasks.md'), s => s.replace('(AC-001)', '(AC-999)'));
  const errors = validateSpecSet(root).errors;
  assert.ok(errors.some(x => x.includes('AC-999 inexistente')));
  assert.ok(errors.some(x => x.includes('AC-001 sem tarefa')));
}));

test('validador rejeita spec implementada com tarefas abertas ou placeholders', () => fixture(root => {
  const dir = createSpec(root, 'Teste');
  edit(join(dir.path, 'spec.md'), s => s.replace('**Status:** draft', '**Status:** implemented'));
  const errors = validateSpecSet(root).errors;
  assert.ok(errors.some(x => x.includes('ainda aberta')));
  assert.ok(errors.some(x => x.includes('placeholders')));
}));

test('checagem de domínio aceita módulo puro e rejeita browser ou import externo', () => fixture(root => {
  const domain = join(root, 'src/domain');
  mkdirSync(domain, { recursive: true });
  const file = join(domain, 'saldo.js');
  writeFileSync(file, 'export function saldo(a, b) { return a - b; }\n');
  assert.deepEqual(checkDomainBoundaries(root).errors, []);
  writeFileSync(file, "import { x } from '../services/x.js';\nexport const a = document.title;\n");
  const errors = checkDomainBoundaries(root).errors;
  assert.ok(errors.some(x => x.includes('fora de src/domain')));
  assert.ok(errors.some(x => x.includes('navegador')));
}));

test('camada domain do projeto não depende de UI ou backend', () => {
  const result = checkDomainBoundaries(projectRoot);
  assert.equal(result.scanned >= 3, true);
  assert.deepEqual(result.errors, []);
});
