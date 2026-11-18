# Configuração do Firebase (opcional)

Sem configuração, o projeto roda em **modo demonstração** (dados em memória, sem Firebase).
Para usar um backend real, crie um **projeto Firebase separado, exclusivo para demonstração/testes** — nunca reutilize um banco de produção.

## 1. Criar o projeto
1. Console Firebase → novo projeto → adicionar app **Web**.
2. Ative **Authentication → Sign-in method → E-mail/senha**. **Não** ative o login anônimo.
3. Crie um **Realtime Database**.

## 2. Configurar o front-end
Copie `js/firebase-config.example.js` para `js/firebase-config.local.js` e preencha com a configuração do seu app web.
Esse arquivo está no `.gitignore`. A configuração web do Firebase não é um segredo por si só; a segurança vem das regras abaixo.

## 3. Publicar as Security Rules
O arquivo `database.rules.json` implementa:
- nenhum acesso por padrão (`.read`/`.write` = `false` na raiz);
- coleções operacionais legíveis/graváveis apenas por usuários **com perfil cadastrado** (`usuarios/{uid}`);
- `logs` somente leitura para admin e somente **inclusão** (não é possível editar/apagar entradas), com `uid` do autor validado;
- `usuarios` legível/gravável somente por admin; cada usuário lê apenas o próprio perfil.

Publicação: `firebase deploy --only database` (Firebase CLI) ou colar o conteúdo na aba **Regras** do console.

## 4. Criar o primeiro administrador (bootstrap)
Como só admins gravam em `usuarios`, o primeiro é criado manualmente:
1. Authentication → adicionar usuário (e-mail e senha forte). Copie o **UID**.
2. Realtime Database → crie o nó `gestaoPecasApp/usuarios/<UID>` com:
   ```json
   { "nome": "Administrador", "email": "seu@email.com", "role": "admin", "dataCadastro": "2026-01-01" }
   ```
3. Entre no sistema; os demais usuários são criados pela tela **Usuários**.

## Observações de segurança
- Alguém com a configuração web pode chamar a API de cadastro do Firebase Authentication. Sem nó em `usuarios/<uid>` essa conta **não consegue ler nem gravar nada** (as regras exigem perfil). Para reduzir ainda mais, desative cadastros por e-mail via Identity Platform ou use funções de backend.
- Excluir um usuário na tela remove o **perfil** (bloqueia o acesso). A conta em Authentication deve ser removida no console ou via Admin SDK/Cloud Function.
- Teste as regras no **Emulator Suite** antes de usar esse modo com dados reais.
