# Plano técnico: segurança Firebase

**Spec:** [spec.md](spec.md)

## Componentes e arquivos afetados

- `database.rules.json`, `docs/FIREBASE.md`, testes futuros para o Emulator Suite; possíveis ajustes localizados em `src/services/data-store.js` somente após testes reproduzirem falhas.

## Estratégia de testes

- **AC-001:** tentar leitura/escrita sem autenticação, esperando erro de permissão.
- **AC-002:** usar usuário `user` para consultar logs e alterar perfis, esperando rejeição.
- **AC-003:** testar operações administrativas válidas e tentativa de forjar autoria de log.
- **AC-004:** executar tudo em instância isolada do emulador, sem credenciais reais.

## Riscos e compatibilidade

O modo demonstração continua independente do backend. Regras novas não devem ampliar acesso acidentalmente; manter mudanças atrás de testes de permissão e revisão.

## Alternativas e decisão

Preferir o Emulator Suite ao uso de um banco em nuvem para os testes. Trabalho ainda não iniciado.
