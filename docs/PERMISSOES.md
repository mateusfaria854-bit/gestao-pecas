# Perfis e permissões

| Ação                                              | Usuário (`user`) | Administrador (`admin`) |
|---------------------------------------------------|:---:|:---:|
| Ver dashboard, estoque, curva A, fornecedores     | ✔ | ✔ |
| Cadastrar/editar peças, entradas, baixas, envios  | ✔ | ✔ |
| Relatórios                                        | ✔ | ✔ |
| Registrar no log (automático)                     | ✔ | ✔ |
| Consultar o log de atividades                     | ✘ | ✔ |
| Criar / editar / excluir usuários                 | ✘ | ✔ |
| Enviar redefinição de senha                       | ✘ | ✔ |
| Alterar perfis (admin/usuário)                    | ✘ | ✔ |

Regras de proteção:
- Não existe cadastro público; contas são criadas por administradores.
- O admin não pode excluir a si mesmo nem rebaixar o próprio perfil (evita ficar sem administradores).
- A autorização usa `role` armazenado em `usuarios/{uid}` e conferido nas Security Rules — nunca o nome da pessoa.
- Senhas não são armazenadas no banco; ficam no Firebase Authentication.
