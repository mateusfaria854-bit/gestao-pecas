# Guia de desenvolvimento e agentes do GestãoPeças

Este documento define o contexto mínimo para ferramentas de programação assistida por IA. A arquitetura, a especificação e os testes são a fonte de verdade; respostas de chats não são documentação do projeto.

## Contexto

- Aplicação estática: HTML, CSS e JavaScript (Node.js 22+ apenas para build e testes).
- Demonstração pública: dados **fictícios em memória**. Firebase é opcional e experimental.
- Código-fonte: `src/`. `dist/app.js` é gerado por `npm run build` e não deve ser editado manualmente.
- Arquitetura: `docs/ARQUITETURA.md`; regras: `specs/constitution.md`.

## Fluxo de trabalho (SDD)

1. Identificar o comportamento e a mudança proposta. Para funcionalidades, usar `specs/NNN-nome/spec.md` antes de alterar o código.
2. Definir critérios de aceitação verificáveis (`AC-001`, `AC-002`, ...), escopo e restrições; registrar dúvidas ainda não resolvidas.
3. Planejar arquivos, dependências, riscos, rollback e testes em `plan.md`.
4. Dividir a implementação em tarefas pequenas rastreadas em `tasks.md`, com referência a pelo menos um `AC-xxx`.
5. Implementar incrementalmente, escrevendo testes quando cabível. Atualizar o estado da especificação para `implemented` somente após concluir as tarefas e verificar os critérios.
6. Executar `npm run spec:check`, `npm run arch:check`, `npm test` e `npm run build`. Para mudanças na interface, rodar os testes Playwright (`python3 tests/test_demo.py` e `python3 tests/test_melhorias.py`) e conferir a demo.
7. Registrar o resultado real dos testes no PR. Nunca afirmar que um teste passou se ele não foi executado.

Uma correção pequena pode utilizar uma Issue com critérios de aceite em vez de criar uma especificação extensa; não criar documentação artificial para cada alteração trivial.

## Fronteiras de responsabilidade

- `src/domain/`: regras puras; sem DOM, `window`, `localStorage` ou Firebase. Importações apenas de outros módulos do domínio.
- `src/features/`: controladores de interface que aplicam as regras e chamam serviços.
- `src/services/`: persistência e integrações. Há acoplamento legado de `data-store.js` com UI que deve ser reduzido em mudanças futuras, não ampliado.
- `src/components/`: elementos de UI reutilizáveis, como modais e notificações.
- `src/styles/`: CSS organizado por responsabilidade. SCSS não é requisito atual; adicionar dependências só quando houver necessidade concreta.
- `index.html` e `dist/app.js`: interface e bundle de compatibilidade com handlers inline existentes. Não migrar tudo de uma vez.

## Regras de segurança e qualidade

- Nunca publicar dados operacionais reais, senhas, tokens nem segredos.
- Não conectar a demonstração pública a um Firebase de produção.
- Para alterações em saldo, histórico de custo ou baixas: testar resultados e ausência de mutação antes de validar.
- Preservar acessibilidade, navegação por teclado, responsividade e proteção contra CSV injection/XSS.
- Mudanças estruturais via branch + PR. Não fazer merge sem verificar a CI.
- Comentários em código explicam **por que** existe uma decisão ou regra, não recados a quem está lendo o GitHub.

## Comandos

```bash
npm run spec:new -- nome-da-funcionalidade
npm run spec:check
npm run arch:check
npm test
npm run build
```

Mais detalhes e exemplo completo em `docs/SDD.md` e `specs/001-fluxo-sdd/`.
