# ADR 0001: SDD incremental e fronteiras arquiteturais

**Estado:** aceita

## Contexto

O projeto começou como uma aplicação web estática com código JavaScript global; evoluiu para pastas por responsabilidades, módulos ES e um bundle de compatibilidade. Existem testes unitários e testes integrados com Playwright. A adição de funcionalidades com auxílio de IA exige acordos claros para evitar regressões e acoplamentos adicionais.

## Decisão

- Adotar especificações pequenas (`spec.md`, `plan.md`, `tasks.md`), com critérios `AC-xxx` e tarefas `T-xxx` rastreáveis.
- Validar automaticamente a estrutura documental e as regras de independência da camada `domain`.
- Usar `AGENTS.md` e uma skill específica do Claude Code como guias de orquestração, sem atrelar o projeto a um único agente.
- Preservar JavaScript puro, CSS modular e o bundle de compatibilidade. Não introduzir SCSS, frameworks ou nova persistência nesta etapa.
- Registrar o acoplamento legado de `services/data-store.js` como dívida técnica, a ser reduzida por mudança incremental com testes.

## Alternativas consideradas

1. Adotar integralmente uma ferramenta externa de Spec Kit: maior abrangência, mas dependências e estrutura desproporcionais para um projeto de portfólio.
2. Migrar tudo para React/TypeScript/SCSS junto com o SDD: risco alto de regressão e pouca evidência de valor para os casos atuais.

## Consequências

- Novas funcionalidades têm requisitos, plano e tarefas versionados ao lado do código.
- O CI verifica a estrutura de specs e a pureza da camada de domínio.
- A validação documental não substitui testes de comportamento, segurança e revisão de PR.
