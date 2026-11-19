import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFile = fileURLToPath(import.meta.url);
const projectRoot = resolve(dirname(currentFile), '..');

/** Cria os três documentos sem alterar especificações existentes. */
export function createSpec(root, title) {
  if (!title || !title.trim()) throw new Error('Informe o nome da funcionalidade.');
  const slug = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!slug || slug.length > 60) throw new Error('Nome inválido ou longo demais (máximo de 60 caracteres).');
  const specsRoot = join(root, 'specs');
  const templatesRoot = join(specsRoot, '_templates');
  const existing = readdirSync(specsRoot).map(name => /^(\d{3})-/.exec(name)?.[1])
    .filter(Boolean).map(Number);
  const next = Math.max(0, ...existing) + 1;
  if (next > 999) throw new Error('Limite de IDs de 3 dígitos atingido.');
  const id = String(next).padStart(3, '0');
  const destination = join(specsRoot, `${id}-${slug}`);
  if (existsSync(destination)) throw new Error('A especificação já existe.');
  const humanTitle = slug.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  const docs = ['spec.md', 'plan.md', 'tasks.md'].map(filename => ({
    filename,
    content: readFileSync(join(templatesRoot, filename), 'utf8')
      .replaceAll('{{ID}}', id).replaceAll('{{TITLE}}', humanTitle),
  }));
  mkdirSync(destination);
  for (const doc of docs) writeFileSync(join(destination, doc.filename), doc.content);
  return { id, path: destination };
}

if (process.argv[1] && resolve(process.argv[1]) === currentFile) {
  try {
    const result = createSpec(projectRoot, process.argv.slice(2).join(' '));
    console.log(`✓ Especificação ${result.id} criada em ${result.path}`);
  } catch (error) {
    console.error(`✗ ${error.message}`);
    process.exitCode = 1;
  }
}
