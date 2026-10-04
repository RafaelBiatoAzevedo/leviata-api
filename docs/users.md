# Gerenciamento de usuários

As rotas são autenticadas e usam IDs UUID. O gerenciamento de outras contas exige `SUPER_ADMIN`; `ADMIN` pode editar apenas sua própria conta.

| Método | Rota               | Acesso                                                      |
| ------ | ------------------ | ----------------------------------------------------------- |
| POST   | `/users`           | Superadministrador                                          |
| GET    | `/users`           | Superadministrador; retorna lista                           |
| GET    | `/users/paginated` | Superadministrador; retorna `{ items, total, page, limit }` |
| GET    | `/users/:id`       | Superadministrador                                          |
| PATCH  | `/users/:id`       | Superadministrador                                          |
| DELETE | `/users/:id`       | Superadministrador; exclusão lógica                         |
| GET    | `/users/me`        | Conta autenticada                                           |
| PATCH  | `/users/me`        | Conta autenticada                                           |

A listagem aceita `page`, `limit` (até 100), `search` (nome/e-mail), `role`, `isActive` (`true`/`false`), `sortBy` e `sortOrder`. Senhas e hashes de tokens nunca são retornados nas respostas.

Na criação, envie `email` e `password` (8 caracteres no mínimo, até 72 bytes UTF-8). Nome, sobrenome, nível e status são opcionais. Na edição, omita `password` para mantê-la. E-mails são normalizados e únicos, inclusive para contas excluídas.

`PATCH /users/me` aceita apenas nome, sobrenome, e-mail, nova senha e `currentPassword`. Alterar e-mail ou senha exige verificar a senha atual. A pessoa deve entrar novamente após alterar suas credenciais. Não é possível alterar permissões/status por essa rota.

O gerenciamento impede excluir/desativar a própria conta ou alterar seu nível de acesso. Transações serializáveis preservam ao menos um superadministrador ativo. Alterações de senha, e-mail, status ou nível e o logout invalidam sessões anteriores por `tokenVersion`.

## Banco de dados

Antes de iniciar a API atualizada, aplique a migration `20261004180000_add_user_account_management`:

```sh
npx prisma migrate deploy
npx prisma generate
```

A migration adiciona `deletedAt`, `deletedById` e `tokenVersion` ao modelo existente. Não altera as senhas das contas já cadastradas. Tokens antigos continuam válidos para contas inalteradas na versão zero.
