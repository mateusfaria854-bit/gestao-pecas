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

O código-fonte usa módulos ES com dependências explícitas por `import`. O sistema original mantém eventos inline em HTML; para evitar regressões, `npm run build` gera `dist/app.js`, um bundle clássico com ordem controlada por `scripts/build.mjs`. Edite apenas `src/`; não modifique o bundle manualmente.

Próxima etapa futura: substituir os eventos inline por listeners nativos e carregar `src/main.js` diretamente.

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
