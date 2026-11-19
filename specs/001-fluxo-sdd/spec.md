# 001 - Fluxo de trabalho SDD e governança de IA

**Status:** implemented
**Issue:** iniciativa de melhoria de arquitetura

## Problema

Sem uma especificação versionada, mudanças geradas com IA podem perder contexto, misturar regras e interface ou afirmar funcionalidades não verificadas.

## Escopo

Introduzir regras do projeto, templates, scripts para criar e verificar specs, barreira automática para a camada de domínio e instruções locais para agentes de programação. Não alterar a interface, o Firebase nem a semântica das regras operacionais.

## Critérios de aceitação

- **AC-001:** Um comando cria uma nova pasta `specs/NNN-nome/` com `spec.md`, `plan.md` e `tasks.md`, sem sobrescrever pastas existentes.
- **AC-002:** O validador rejeita specs sem arquivos obrigatórios, critérios repetidos ou tarefas sem referência a um critério existente.
- **AC-003:** Uma spec marcada `implemented` com tarefas não concluídas ou placeholders permanece inválida.
- **AC-004:** Documentação e instruções para agentes explicitam responsabilidades das camadas, limites da demo e fluxo SDD, incluindo skill local do Claude Code.
- **AC-005:** O GitHub Actions executa verificação de specs e da camada de domínio, além dos testes existentes.
- **AC-006:** Os arquivos JavaScript da camada `domain` continuam sem uso de APIs de navegador ou importações fora de `domain`.

## Restrições

- Não adicionar dependências npm em tempo de execução.
- Não alterar `index.html`, `src/` nem o backend da demonstração.
- Não introduzir SCSS apenas por preferência estética.

## Dúvidas em aberto

Nenhuma para esta etapa.
