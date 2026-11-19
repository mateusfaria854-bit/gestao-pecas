# Constituição técnica do GestãoPeças

## Princípios

1. **Preservar a demonstração.** A versão pública é estática, acessível sem credenciais e contém somente dados fictícios. O modo Firebase não deve ser habilitado por padrão.
2. **Regras de negócio isoladas.** Validação de quantidades, custos, baixas e conversão CSV devem ser testáveis em `src/domain/`, sem DOM, Firebase ou estado de navegação.
3. **Responsabilidade explícita.** Interface em `features/` e `components/`; serviços de persistência e integrações em `services/`; layout e apresentação em `styles/`; inicialização em `core/`.
4. **Compatibilidade incremental.** Não quebrar fluxos existentes em nome de uma migração estética. `dist/app.js` é um artefato de build e segue necessário enquanto o HTML mantém handlers inline.
5. **Segurança e dados.** Sem segredos no repositório, sem dados internos de empresas; validar entrada e saída, autorização e comportamento em caso de erro.
6. **Requisitos rastreáveis.** Mudanças de funcionalidades exigem critérios de aceitação verificáveis e testes adequados; evitar soluções grandiosas quando uma alteração localizada é suficiente.
7. **Entrega verificável.** Tests e CI são evidências, não promessas. Um PR só é considerado pronto quando seus critérios e testes aplicáveis foram avaliados.
8. **Documentação útil.** README explica o produto; arquitetura explica decisões; especificações explicam comportamentos; guias de agentes ficam em `AGENTS.md` e `.claude/`.

## Limites conhecidos

- `src/services/data-store.js` ainda contém acoplamentos com controladores e notificações da interface. A direção de dependências ideal é um objetivo incremental, não uma propriedade garantida da versão atual.
- O modo Firebase opcional demanda testes das regras no Emulator Suite e revisão da persistência concorrente antes de uso produtivo.
- O CSS atual já foi separado por responsabilidade; não é necessário migrar para Sass/SCSS sem uma demanda concreta.

## Verificações mínimas

`npm run spec:check`, `npm run arch:check`, `npm test`, `npm run build`; para mudança visual ou de fluxo, executar os testes integrados no navegador.
