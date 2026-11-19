# 002 - Validação de regras de segurança do Firebase

**Status:** draft
**Issue:** https://github.com/mateusfaria854-bit/gestao-pecas/issues/3

## Problema

O modo Firebase é opcional e experimental; ainda falta evidência automatizada sobre os limites de leitura, escrita e elevação de permissões entre perfis.

## Escopo

Testar as regras do Realtime Database usando o Firebase Emulator Suite, com contas fictícias e cenário isolado. Não conectar a demonstração pública ao banco real nem implementar integração de manutenção externa.

## Critérios de aceitação

- **AC-001:** Usuário sem autenticação não pode ler nem gravar coleções operacionais.
- **AC-002:** Usuário com perfil `user` não pode alterar perfis de outros usuários nem consultar logs restritos.
- **AC-003:** Administrador pode executar operações autorizadas e não pode manipular logs de outro autor.
- **AC-004:** Os testes são reproduzíveis em ambiente local com instruções documentadas, sem segredos de produção.

## Restrições

- O Firebase de produção não deve ser utilizado nos testes.
- As regras precisam ser verificadas contra o comportamento atual antes de propor novas permissões.

## Dúvidas em aberto

- Definir se a criação de usuários deve depender de Cloud Function ou procedimento administrativo manual.
