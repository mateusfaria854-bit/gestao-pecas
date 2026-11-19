# Arquitetura do GestãoPeças

## Objetivo

Separar interface, regras de negócio e persistência sem alterar as funcionalidades. A demonstração é independente do Firebase e trabalha com dados fictícios em memória.

## Estrutura e responsabilidades

- `src/core/`: estado de navegação e inicialização
- `src/domain/`: regras puras e testáveis de estoque, baixas e CSV
- `src/services/`: camada de dados (demo ou Firebase opcional) e OS simuladas
- `src/features/`: fluxos e controladores das telas
- `src/components/`: diálogo modal e notificações
- `src/utils/`: formatação e funções auxiliares
- `src/styles/`: tokens, base, layout, formulários, tabelas, dashboard, login e responsividade

## Fluxo

1. A interface coleta valores nos formulários.
2. O controlador em `features/` aplica validações e chama funções puras em `domain/`.
3. O serviço `Dados` persiste no modo demonstração ou no Firebase opcional.
4. O controlador renderiza a tela e notifica o usuário.

## Compatibilidade e build

O código-fonte usa módulos ES com dependências explícitas por `import`. O sistema original mantém eventos inline em HTML; para evitar regressões, `npm run build` gera `dist/app.js`, um bundle clássico com ordem controlada por `scripts/build.mjs`. O arquivo `dist/app.js` é gerado a partir de `src/`; alterações diretas no bundle são substituídas no próximo build.

Evolução planejada: substituir os eventos inline por listeners nativos e carregar `src/main.js` diretamente.

## Testes

```bash
npm run build
npm test
python3 tests/test_demo.py
python3 tests/test_melhorias.py
```

Os testes unitários rodam em Node.js, sem navegador; os testes de regressão exigem Python, Playwright e Chromium.

## Decisões e limites

- Demo isolada, sem gravação em produção e sem senhas reais.
- Funções puras de saldo não modificam os dados até a validação terminar.
- CSS dividido por responsabilidade, com responsividade agrupada.
- `style="display:none"` permanece em alguns elementos cujo estado é controlado pelo JavaScript.
- Firebase opcional requer testes de regras no Emulator Suite e concorrência antes de uso produtivo.

## Regras de evolução e fronteiras verificadas

O desenvolvimento de funcionalidades utiliza especificações versionadas em `specs/` com critérios de aceitação, plano, tarefas e evidências de testes. O processo está documentado em [SDD](SDD.md), e os princípios de arquitetura estão em [`specs/constitution.md`](../specs/constitution.md).

A verificação automática `npm run arch:check` protege a camada `src/domain/` contra dependências de navegador, Firebase e outros diretórios. É uma restrição **específica do domínio**; não implica que todas as demais dependências do projeto já estejam ideais. Atualmente, `src/services/data-store.js` ainda importa funções de interface, um acoplamento legado que requer migração incremental com testes.

A decisão de não adicionar SCSS nem trocar a stack nesta etapa está registrada em [ADR 0001](adr/0001-sdd-incremental.md).
