import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFile = fileURLToPath(import.meta.url);
const projectRoot = resolve(dirname(currentFile), '..');
const REQUIRED = ['spec.md', 'plan.md', 'tasks.md'];
const STATES = new Set(['draft', 'planned', 'implemented']);

/** Retorna problemas rastreáveis sem modificar a especificação. */
export function validateSpecSet(root = projectRoot) {
  const specsRoot = join(root, 'specs');
  const errors = [];
  const specs = [];
  if (!existsSync(specsRoot)) return { errors: ['Pasta specs/ ausente.'], specs };

  const directories = readdirSync(specsRoot)
    .filter(name => statSync(join(specsRoot, name)).isDirectory() && !name.startsWith('_'));
  const knownIds = new Set();
  if (!directories.length) errors.push('Nenhuma especificação numerada encontrada.');

  for (const folder of directories) {
    const prefix = `${folder}:`;
    const match = /^(\d{3})-([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(folder);
    if (!match) { errors.push(`${prefix} nome inválido: esperado NNN-nome-em-kebab-case.`); continue; }
    const id = match[1];
    if (knownIds.has(id)) errors.push(`${prefix} identificador numérico ${id} repetido.`);
    knownIds.add(id);
    const path = join(specsRoot, folder);
    const files = {};
    for (const filename of REQUIRED) {
      const full = join(path, filename);
      if (!existsSync(full)) errors.push(`${prefix} falta ${filename}.`);
      else files[filename] = readFileSync(full, 'utf8');
    }
    specs.push(folder);
    if (REQUIRED.some(filename => !files[filename])) continue;
    const spec = files['spec.md'];
    const plan = files['plan.md'];
    const tasks = files['tasks.md'];

    if (!spec.startsWith(`# ${id} - `)) errors.push(`${prefix} spec.md deve começar com '# ${id} - ...'.`);
    const status = /\*\*Status:\*\*\s*(\S+)/.exec(spec)?.[1];
    if (!STATES.has(status)) errors.push(`${prefix} Status inválido: ${status ?? 'não informado'}.`);
    if (!spec.includes('## Critérios de aceitação')) errors.push(`${prefix} seção 'Critérios de aceitação' ausente.`);
    const acIds = [...spec.matchAll(/\*\*(AC-\d{3}):\*\*/g)].map(m => m[1]);
    if (acIds.length === 0) errors.push(`${prefix} nenhum critério AC-xxx encontrado.`);
    for (const ac of acIds) {
      if (acIds.filter(x => x === ac).length !== 1) errors.push(`${prefix} critério ${ac} duplicado.`);
    }

    for (const heading of ['## Componentes e arquivos afetados', '## Estratégia de testes', '## Riscos e compatibilidade']) {
      if (!plan.includes(heading)) errors.push(`${prefix} plan.md sem seção '${heading}'.`);
    }
    if (!plan.includes('(spec.md)') || !tasks.includes('(spec.md)')) errors.push(`${prefix} plano e tarefas devem apontar para spec.md.`);

    const tasksFound = [...tasks.matchAll(/^- \[([ xX])\] \*\*(T-\d{3})\*\* \((AC-\d{3}(?:,\s*AC-\d{3})*)\):/gm)]
      .map(m => ({ checked: m[1].toLowerCase() === 'x', id: m[2], ac: m[3].split(',').map(s => s.trim()) }));
    if (!tasksFound.length) errors.push(`${prefix} nenhuma tarefa válida T-xxx encontrada.`);
    const taskIds = new Set();
    const used = new Set();
    for (const task of tasksFound) {
      if (taskIds.has(task.id)) errors.push(`${prefix} tarefa ${task.id} duplicada.`);
      taskIds.add(task.id);
      for (const ac of task.ac) {
        used.add(ac);
        if (!acIds.includes(ac)) errors.push(`${prefix} tarefa ${task.id} referencia ${ac} inexistente.`);
      }
      if (status === 'implemented' && !task.checked) errors.push(`${prefix} ${task.id} ainda aberta, mas Status é implemented.`);
    }
    for (const ac of new Set(acIds)) {
      if (!used.has(ac)) errors.push(`${prefix} ${ac} sem tarefa vinculada.`);
      if (!plan.includes(ac)) errors.push(`${prefix} ${ac} sem estratégia documentada em plan.md.`);
    }
    if (status === 'implemented' && /\[(?:Descrever|Indicar|Explicitar|Implementar|Motivo|Especificar|Outras|Descrever)/i.test(spec + plan + tasks)) {
      errors.push(`${prefix} há placeholders em uma especificação marcada implemented.`);
    }
  }
  return { errors: [...new Set(errors)], specs };
}

if (process.argv[1] && resolve(process.argv[1]) === currentFile) {
  const result = validateSpecSet();
  if (result.errors.length) {
    result.errors.forEach(error => console.error(`✗ ${error}`));
    process.exitCode = 1;
  } else {
    console.log(`✓ ${result.specs.length} especificações verificadas (estrutura, rastreabilidade e status).`);
  }
}
