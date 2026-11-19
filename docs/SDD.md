# Desenvolvimento guiado por especificações (SDD)

O GestãoPeças adota um fluxo leve de **Spec-Driven Development**: comportamento → plano → tarefas → código → testes → revisão. O objetivo é orientar pessoas e ferramentas de IA com critérios verificáveis, sem depender de prompts isolados nem adicionar frameworks sem necessidade.

## Fluxo do projeto

| Etapa | Arquivo / evidência | Pergunta respondida |
|---|---|---|
| Especificação | `specs/NNN-nome/spec.md` | O que deve acontecer? Quais são os casos de erro? |
| Plano | `plan.md` | Como implementar, com que dependências e riscos? |
| Tarefas | `tasks.md` | Quais mudanças pequenas atendem a cada critério? |
| Implementação | `src/`, testes, documentação | O comportamento está implementado sem regressões? |
| Verificação | `npm run spec:check`, `npm run arch:check`, `npm test`, CI | Os critérios estão rastreados e o sistema continua funcional? |

## Exemplo concreto

- `specs/001-fluxo-sdd/`: adoção do próprio processo, incluindo plano, tarefas concluídas e teste automatizado.
- `specs/002-regras-firebase/`: especificação **em rascunho** para validação das regras Firebase, vinculada ao roadmap. Não corresponde a uma funcionalidade já concluída.

## Comandos

Requer Node.js 22+; não há dependências adicionais.

```bash
npm run spec:new -- importacao-planilhas
npm run spec:check
npm run arch:check
npm test
npm run build
```

`spec:new` cria a próxima pasta numerada e os três documentos básicos. `spec:check` valida a estrutura e a rastreabilidade dos critérios e tarefas; não prova sozinho que o comportamento está correto. `arch:check` protege a independência de `src/domain/`. `npm test` executa testes unitários; os testes Playwright existentes exercitam a interface.

## Estados

- `draft`: requisitos iniciais, com dúvidas e opções em aberto.
- `planned`: comportamento e plano acordados, com tarefas definidas.
- `implemented`: todas as tarefas marcadas como concluídas e critérios verificados por testes ou evidências documentadas. O status documental não substitui o CI.

Os templates vivem em `specs/_templates/`. O validador não exige uma spec completa para alterações editoriais triviais, nem gera código por conta própria.

## Compatibilidade com Claude Code e outros agentes

- `AGENTS.md`: regras e contexto compartilhados entre agentes.
- `CLAUDE.md`: entrada curta para Claude Code.
- `.claude/skills/gestao-pecas-sdd/SKILL.md`: skill do projeto, aplicada quando relevante.

Esses arquivos estabelecem convenções **dentro do repositório**. A ativação da skill depende da ferramenta/ambiente de desenvolvimento instalado pelo usuário; os arquivos não instalam nem controlam um agente por si só.

## Decisão sobre SCSS

O projeto já usa CSS separado por responsabilidade em `src/styles/`. SCSS só será introduzido se surgir uma necessidade real de mixins, variáveis de compilação ou reutilização além do CSS atual. A organização de código e as regras de negócio têm prioridade.

## Referências

- [GitHub Spec Kit](https://github.com/github/spec-kit)
- [Spec Kit: Quickstart](https://github.github.com/spec-kit/quickstart)
- [Anthropic: Agent Skills](https://www.anthropic.com/research/equipping-agents-for-the-real-world-with-agent-skills)
