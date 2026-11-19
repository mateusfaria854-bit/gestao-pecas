# Especificações de funcionalidades

As pastas `NNN-nome/` acompanham comportamentos entregues ou planejados. Cada uma contém:

- `spec.md`: problema, escopo e critérios de aceitação (`AC-xxx`).
- `plan.md`: arquitetura envolvida, estratégia de implementação e testes.
- `tasks.md`: tarefas (`T-xxx`) rastreáveis a critérios de aceitação.

Padrões de escrita e critérios de conclusão: [docs/SDD.md](../docs/SDD.md) e [constitution.md](constitution.md).

| ID | Especificação | Estado |
|---|---|---|
| 001 | [Fluxo SDD, verificações e orientação para agentes](001-fluxo-sdd/spec.md) | Implementada |
| 002 | [Regras de segurança Firebase](002-regras-firebase/spec.md) | Rascunho, futuro |

Novas pastas podem ser inicializadas com `npm run spec:new -- nome-da-funcionalidade`.
