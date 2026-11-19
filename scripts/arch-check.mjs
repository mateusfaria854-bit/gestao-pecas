import { readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFile = fileURLToPath(import.meta.url);
const projectRoot = resolve(dirname(currentFile), '..');

/** Verifica os invariantes que já são garantidos em src/domain/. */
export function checkDomainBoundaries(root = projectRoot) {
  const domain = join(root, 'src/domain');
  const errors = [];
  let scanned = 0;
  const visit = directory => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) { visit(path); continue; }
      if (!entry.isFile() || !entry.name.endsWith('.js')) continue;
      scanned++;
      const code = readFileSync(path, 'utf8');
      const name = path.slice(domain.length + 1);
      if (/\b(?:window|document|localStorage|sessionStorage|globalThis|firebase|XMLHttpRequest)\b/.test(code)) {
        errors.push(`${name}: camada de domínio não pode usar navegador, armazenamento ou Firebase.`);
      }
      const imports = [...code.matchAll(/\b(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g)].map(m => m[1]);
      for (const target of imports) {
        if (!target.startsWith('./') && !target.startsWith('../')) {
          errors.push(`${name}: importação externa não permitida em domain: ${target}.`);
          continue;
        }
        const resolved = resolve(dirname(path), target);
        if (!(resolved === domain || resolved.startsWith(domain + '/'))) {
          errors.push(`${name}: dependência fora de src/domain/: ${target}.`);
        }
      }
      if (/\bimport\s*\(/.test(code) || /\brequire\s*\(/.test(code)) {
        errors.push(`${name}: importação dinâmica ou require não permitida no domínio.`);
      }
    }
  };
  visit(domain);
  if (scanned === 0) errors.push('Nenhum módulo de domínio encontrado.');
  return { errors, scanned };
}

if (process.argv[1] && resolve(process.argv[1]) === currentFile) {
  const result = checkDomainBoundaries();
  if (result.errors.length) {
    result.errors.forEach(error => console.error(`✗ ${error}`));
    process.exitCode = 1;
  } else {
    console.log(`✓ ${result.scanned} módulos de src/domain/ sem dependências proibidas.`);
  }
}
