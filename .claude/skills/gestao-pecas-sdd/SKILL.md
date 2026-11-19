---
name: gestao-pecas-sdd
description: Aplicar Spec-Driven Development no GestãoPeças ao criar ou alterar funcionalidades, regras de estoque, baixas, Firebase, relatórios, testes e arquitetura. Usar quando o trabalho precisar de especificação, planejamento, tarefas e validação.
---

# Desenvolvimento guiado por especificações

## Contexto obrigatório

1. Ler `AGENTS.md` e `specs/constitution.md`.
2. Consultar `docs/ARQUITETURA.md`, a feature afetada em `src/` e os testes relacionados.
3. Buscar especificação existente em `specs/` e issue correspondente para evitar duplicação.

## Procedimento

**Especificar:** descrever problema e comportamento observável em `specs/NNN-slug/spec.md`; usar critérios `AC-xxx`, incluindo casos inválidos e limites da demonstração. Separar *o quê* de *como*.

**Planejar:** em `plan.md`, escolher componentes e dependências, efeitos em Firebase/demo, regressões e testes de cada critério. Registrar decisões e alternativas quando houver trade-offs.

**Decompor:** em `tasks.md`, cada `T-xxx` cita os `AC-xxx` que atende. Priorizar tarefas pequenas e testáveis; marcar `[x]` apenas após conclusão efetiva.

**Executar:** primeiro garantir teste capaz de falhar quando o comportamento exigido estiver ausente, depois implementar no módulo correto. Regras puras ficam em `src/domain`, nunca em `index.html`.

**Validar:** executar `npm run spec:check`, `npm run arch:check`, `npm test`, `npm run build` e, quando a interface for afetada, os testes Playwright. Conferir diff, compatibilidade, dados fictícios e documentação.

**Concluir:** comparar a solução com cada critério; registrar evidências verificáveis no PR e alterar `**Status:** implemented` apenas com tarefas concluídas. Se qualquer critério falhar, deixar explícito e não fazer merge.

## Atalhos úteis

- `npm run spec:new -- nome-da-funcionalidade`: cria estrutura inicial sem sobrescrever specs existentes.
- `npm run spec:check`: confere nomenclatura, rastreabilidade e conclusão documental.
- `specs/001-fluxo-sdd/`: exemplo completo adotado pelo próprio projeto.
- `specs/002-regras-firebase/`: proposta futura, sem implementação de Firebase real.

A skill orienta o fluxo; não instala automaticamente dependências, não executa comandos sem ferramenta e não substitui revisão humana.
