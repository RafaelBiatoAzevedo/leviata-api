# Permissões e auditoria administrativa

Somente `SUPER_ADMIN` pode excluir registros e arquivos e gerenciar usuários.
O `JwtAuthGuard` recusa `DELETE` para `ADMIN` antes da execução do controller,
mesmo em chamadas diretas à API. As rotas `/users` e `/users/:id` usam também
`SuperAdminGuard`; `/users/me` continua permitindo consultar e editar a própria
conta, sem alterar nível ou status. Os menus e as rotas do frontend mantêm essa
mesma restrição. Excluir uma imagem já salva exige superadministrador; descartar
uma seleção local ainda não enviada continua disponível ao editor.

## Instalação

Antes de iniciar a API atualizada, aplique a migration
`20261102190000_add_admin_activity_audit` e gere o cliente:

```sh
npx prisma migrate deploy
npx prisma generate
```

A tabela `AdminActivity` guarda uma cópia do ator, operação e dados relevantes,
sem uma relação que apague a auditoria ao excluir uma conta. A API reserva esse
registro antes de executar a alteração: se a reserva falhar, a gravação é
interrompida. Portanto, a migration deve ser aplicada antes da atualização da API.

## Avisos por e-mail

O interceptor global registra as requisições autenticadas `POST`, `PATCH` e `PUT`
de usuários `ADMIN`, incluindo uploads, alterações da própria conta, comunicados,
marcações de leitura e ações de envio de newsletters. Criações e edições
concluídas entram na fila; operações recusadas ficam como `ACTION_FAILED` e não
geram um aviso de sucesso. Leituras, sessões de autenticação, prévias ainda não
salvas e a verificação SMTP não são criações/edições e não geram avisos.
Operações de `SUPER_ADMIN` não entram nesta fila.

O destinatário é sempre `MailConfig.settings().from`, o próprio endereço
`MAIL_FROM_EMAIL` usado como remetente das newsletters. O padrão é
`leviataeocativeiro@gmail.com`. O transporte SMTP é o mesmo `MailService`.
Cada mensagem contém nome, e-mail e ID do administrador, data/hora de Brasília,
método e caminho da operação, parâmetros, dados enviados, metadados dos arquivos
e dados retornados após salvar. Senhas, hashes, tokens e chaves são substituídos
por `[sigiloso]`; cabeçalhos de autenticação e bytes dos arquivos não são copiados.
Todo conteúdo incluído no HTML é escapado.

Use a [configuração de newsletters](mail-newsletters.md), com `MAIL_ENABLED=true`,
`MAIL_WORKER_ENABLED=true` e as credenciais prontas. Sem isso, os avisos permanecem
persistidos e serão processados quando a API reiniciar com o envio habilitado.
Nenhuma credencial nova é necessária.

## Recuperação e acompanhamento

A fila usa uma reserva atômica, trava transacional entre instâncias, intervalo de
envio e limite diário da configuração de e-mail. Os avisos e newsletters consomem
a mesma cota SMTP do provedor; os contadores das duas filas são separados.
Falhas transitórias têm novas tentativas com espera progressiva e limite de
`MAIL_MAX_ATTEMPTS`. A edição salva não é desfeita se o SMTP estiver indisponível.

Se a aplicação parar entre a alteração e a confirmação da auditoria, a reserva
`RECORDING` antiga gera um aviso explícito de **resultado a conferir**, sem
afirmar que a edição foi concluída. As duas gravações não formam uma única
transação de negócio. Se o SMTP puder ter aceitado a mensagem e a conexão ou
persistência falhar, a entrega fica `UNKNOWN` e não é repetida automaticamente.
Confira a caixa de enviados e o registro de auditoria antes de uma intervenção.

Rotas autenticadas exclusivas de `SUPER_ADMIN`:

| Rota | Finalidade |
| --- | --- |
| `GET /admin-activity/status` | Totais por estado da auditoria/fila. |
| `POST /admin-activity/retry` | Recoloca somente mensagens `FAILED` na fila, após corrigir a causa. |

`UNKNOWN`, `SENT` e `ACTION_FAILED` não são reenviados por essa rota.

## Validação

Os testes de `auth/jwt-auth.guard.spec.ts` cobrem bloqueios de exclusões de
registros, galerias, capas e PDFs. `admin-activity/admin-activity.spec.ts` cobre
reserva antes de gravar, falhas, dados de uploads, sigilo, destino, HTML escapado,
repetições transitórias, entregas ambíguas e exclusividade das rotas da fila.
Os testes de permissões no frontend conferem controles de exclusão, galerias e
gerenciamento de usuários no menu superior e lateral.
