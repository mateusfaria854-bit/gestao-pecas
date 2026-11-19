# Plano técnico: fluxo SDD

**Spec:** [spec.md](spec.md)

## Componentes e arquivos afetados

- **AC-001:** `scripts/spec-new.mjs`, `specs/_templates/` e `package.json` fornecem a inicialização.
- **AC-002, AC-003:** `scripts/spec-check.mjs` verifica arquivos, identificadores, rastreabilidade e estado.
- **AC-004:** `AGENTS.md`, `CLAUDE.md`, `.claude/skills/gestao-pecas-sdd/SKILL.md`, `docs/SDD.md` e ADR registram o processo.
- **AC-005:** `.github/workflows/testes.yml` integra as verificações.
- **AC-006:** `scripts/arch-check.mjs` protege dependências da camada `src/domain/`.

## Estratégia de testes

- **AC-001:** executar o gerador em pasta temporária e verificar três arquivos e sequência de IDs.
- **AC-002:** submeter specs inválidas e conferir mensagens/erros do validador.
- **AC-003:** validar que tarefas abertas ou texto de template bloqueiam o estado `implemented`.
- **AC-004:** revisão das instruções com caminhos reais e comandos testáveis.
- **AC-005:** CI chama os scripts junto de `npm test` e `npm run build`.
- **AC-006:** teste de verificação negativa para DOM/`window` e imports indevidos no domínio.

## Riscos e compatibilidade

Scripts são ferramentas de desenvolvimento independentes da aplicação estática. Nenhuma dependência nova é adicionada ao navegador; bundle existente permanece inalterado. O validador não afirma que a spec cumpre o comportamento, apenas garante consistência documental básica.

## Alternativas e decisão

Adotado processo leve nativo do Node.js, em vez de adicionar CLI grande e novo ecossistema somente para gerar Markdown.
