# E-mail e envio de newsletters

O `MailModule`, em `src/mail`, usa **Nodemailer** e SMTP do Gmail. O remetente
padrão é **Leviatã e o Cativeiro <leviataeocativeiro@gmail.com>**. O módulo
está integrado à API e inicia com o envio **desativado**; a aplicação e as
inscrições continuam funcionando sem credenciais.

## Configuração posterior

O arquivo [.env.mail.example](../.env.mail.example) contém todas as variáveis.
O bloco também foi preparado no `.env` local, sem senhas ou tokens preenchidos.
As chaves são exclusivas da API: nunca use variáveis `VITE_` para elas.

Escolha uma autenticação:

- **OAuth2, padrão recomendado:** preencha `MAIL_GOOGLE_CLIENT_ID`,
  `MAIL_GOOGLE_CLIENT_SECRET` e `MAIL_GOOGLE_REFRESH_TOKEN`. O refresh token
  deve pertencer a `leviataeocativeiro@gmail.com`, com o escopo SMTP do Google
  `https://mail.google.com/`. Mantenha `MAIL_AUTH_MODE=oauth2`.
- **Senha de aplicativo:** ative a verificação em duas etapas na conta Google,
  gere uma senha de aplicativo e preencha `MAIL_GMAIL_APP_PASSWORD`.
  Use `MAIL_AUTH_MODE=app-password`. A senha normal do Gmail não serve para
  esta configuração. Espaços da senha de aplicativo são removidos pelo módulo.

Gere uma chave estável de descadastro e coloque em `MAIL_UNSUBSCRIBE_SECRET`:

```sh
openssl rand -hex 32
```

Defina `MAIL_PUBLIC_API_URL` como o endereço público da API e `MAIL_PORTAL_URL`
como o endereço público do frontend, sem barra final. Em produção ambos devem
usar HTTPS. Os valores `localhost` do exemplo são apenas para desenvolvimento.

Depois de preencher essas configurações, altere `MAIL_ENABLED=true`, mantenha
`MAIL_WORKER_ENABLED=true` e reinicie a API. As credenciais nunca são retornadas
por endpoints nem gravadas no histórico de entregas. Preserve a chave de
descadastro: trocá-la invalida os links enviados anteriormente.

Referências: [Nodemailer e Gmail](https://nodemailer.com/guides/using-gmail),
[senhas de aplicativo do Google](https://support.google.com/accounts/answer/185833).

## Rotas administrativas

Todas exigem JWT de `ADMIN` ou `SUPER_ADMIN` e aparecem na seção **Mail** do
Swagger. Use o ID da newsletter, disponível na listagem administrativa da API.

| Método e rota                                          | Comportamento                                                                                                                                                 |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /mail/status`                                     | Mostra se o envio está habilitado e quais nomes de variáveis faltam; não expõe valores secretos.                                                              |
| `POST /mail/verify`                                    | Verifica conexão e autenticação SMTP, sem enviar mensagem.                                                                                                    |
| `POST /mail/newsletters/:id/test`                      | Envia uma prévia apenas ao endereço informado no JSON `{ "to": "leviataeocativeiro@gmail.com" }`. Permite testar rascunhos e não marca a edição como enviada. |
| `POST /mail/newsletters/:id/send`                      | Cria a fila para inscritos elegíveis e retorna `202`. Repetir a requisição reutiliza a campanha existente.                                                    |
| `GET /mail/newsletters/:id/status`                     | Mostra totais enviados, pendentes, em processamento, recusados, ignorados e incertos.                                                                         |
| `GET /mail/newsletters/:id/deliveries?page=1&limit=20` | Histórico paginado por destinatário, com status, tentativas e códigos de erro.                                                                                |
| `POST /mail/newsletters/:id/retry`                     | Recoloca apenas falhas confirmadas na fila; não repete envios aceitos ou incertos.                                                                            |
| `POST /mail/newsletters/:id/cancel`                    | Cancela os destinatários pendentes. Uma entrega que já começou no SMTP pode terminar.                                                                         |

Fluxo de ativação: conferir `status` → executar `verify` → enviar uma prévia
para a própria conta → publicar a newsletter → iniciar `send` → acompanhar o
status e o histórico. Nenhum e-mail real foi enviado durante a implementação.

O admin permite optar pelo envio após criar a newsletter e iniciar o envio depois
nos detalhes da edição. Uma falha na solicitação de envio preserva o cadastro e
leva ao acompanhamento, sem exigir uma nova criação. A data de envio no formulário
é informativa e continua sendo atualizada pela API.

O painel também utiliza duas consultas protegidas adicionais:

- `GET /mail/newsletters/:id/audience`: totais de cadastros e destinatários elegíveis.
- `GET /mail/newsletters/:id/subscribers?page=1&limit=15&search=...`: lista
  protegida de IDs, nomes e e-mails dos inscritos aptos, com busca e paginação.
- `GET /mail/newsletters/:id/delivery-records?page=1&limit=20`: registros reais de
  `NewsletterDelivery`, com nome, e-mail e data, inclusive os históricos.

## Fila e histórico

O envio aceita `{ "mode": "ALL" }` para todos os aptos ou
`{ "mode": "SELECTED", "subscriberIds": ["UUID", "UUID"] }` para uma seleção.
Sem corpo, a rota mantém o comportamento anterior de enviar para todos. Seleções
vazias, IDs repetidos ou inválidos são rejeitados; IDs informados no modo `ALL`
também são rejeitados. Se algum escolhido estiver inativo, excluído, sem autorização
ou já tiver recebido a edição, a campanha não é criada e o admin recebe uma mensagem
para atualizar a seleção. As duas modalidades usam a mesma fila e registros de entrega.

O público é definido antes do início da campanha. Repetir uma solicitação mantém
a campanha e seus destinatários originais, sem ampliar a lista nem duplicar envios.

Uma campanha preserva uma cópia do assunto e do conteúdo no momento do envio.
Editar a newsletter depois não altera mensagens que já estão na fila. Há uma
campanha por edição e um registro por inscrito, com proteção transacional contra
requisições repetidas e reserva de destinatários compartilhada entre workers.
O conteúdo de cada mensagem tem HTML, alternativa em texto, link para a página
de newsletters do portal e link individual de descadastro.

Só entram inscritos ativos, não excluídos e com `allowEmail=true`. O consentimento
é conferido novamente imediatamente antes do SMTP. Entregas históricas bem
sucedidas da mesma edição são excluídas da nova fila. Edições já marcadas com
`sentAt` não iniciam campanhas novas; essa regra preserva o acervo existente.

O worker usa o PostgreSQL existente, sem depender de Redis ou de outro serviço.
O padrão é uma reserva a cada **5 segundos**, até **400 destinatários por janela
de 24 horas**, considerando aceitos, em processamento e incertos. Esses limites
são compartilhados pelos workers desta API. A conta Gmail pode ter outros
consumidores; o limite da aplicação não mede envios feitos fora dela.

Uma falha temporária confirmada recebe até três tentativas com espera progressiva.
Falhas de autenticação pausam o worker por uma hora, em vez de testar credenciais
incorretas contra toda a lista. A pausa aparece em `GET /mail/status`; uma
verificação SMTP bem sucedida por `POST /mail/verify` libera o processamento.
Recusas definitivas ficam como `FAILED`. Uma queda durante a aceitação da mensagem,
ou uma interrupção do processo com estado `SENDING` por mais de dez minutos,
vira `UNKNOWN`: exige conferência no provedor, sem reenvio automático. SMTP não
garante entrega exatamente uma vez se a conexão cair depois da aceitação.

`SENT` significa aceitação pelo SMTP, não comprovação de chegada à caixa de entrada.
Após a aceitação, o módulo registra também `NewsletterDelivery`. O `sentAt` da
edição é preenchido quando a campanha termina sem pendências ou falhas e houve
ao menos uma entrega aceita. O módulo não cria rastreamento de abertura/cliques
e não altera os campos históricos dessas métricas.

## Descadastro

O rodapé usa `GET /mail/unsubscribe?token=...`, que apenas mostra confirmação.
O cancelamento acontece no `POST` da mesma URL. Isso evita cancelar inscrições
por varreduras automáticas de links. O POST também atende ao cabeçalho
`List-Unsubscribe-Post: List-Unsubscribe=One-Click` incluído nas mensagens.

Os tokens usam HMAC-SHA256, vinculados ao ID e e-mail do inscrito. O descadastro
desabilita apenas `allowEmail` e preenche `unsubscribedAt`, preservando WhatsApp
e o cadastro. Funciona sem login e também quando novos envios estão desativados,
desde que a chave de assinatura seja mantida. Uma nova inscrição pelo portal
reativa o recebimento, conforme o fluxo que já existia.

## Banco e validação

A migração `20261025180000_add_newsletter_mail_queue` cria duas tabelas de fila e
um enum; não remove dados nem altera entregas antigas.

```sh
npx prisma migrate deploy
npx prisma generate
yarn build
yarn test:mail
```

A suíte de integração usa **somente** `MAIL_TEST_DATABASE_URL` explícita e
substitui o SMTP por um serviço simulado. Ela não usa o banco configurado da
aplicação como fallback e não envia mensagens externas:

```sh
MAIL_TEST_DATABASE_URL='postgresql://.../banco_de_testes' yarn test:mail:e2e
```

Consulte também os [limites do Gmail](https://support.google.com/mail/answer/22839).
O transporte pode ser substituído por outro SMTP no futuro, preservando a fila
e o fluxo de newsletters.

`yarn test:newsletter-selection:integration` verifica as duas modalidades, busca,
paginação, autorização de recebimento e idempotência no PostgreSQL em uma transação
com rollback. Esse teste não inicia o worker nem se conecta ao SMTP.
# PDF da edição

O cadastro visual gera HTML e PDF juntos. O PDF é renderizado do mesmo HTML,
guardado como binário no PostgreSQL e identificado pelo hash da origem. O arquivo
é omitido nas respostas JSON. `GET /newsletter/:id/pdf` faz o download; rascunhos
requerem autenticação de administrador, e edições publicadas permitem acesso público.

Uma campanha guarda sua própria cópia de `htmlContent` e `pdfContent`. Cada envio
usa o HTML no corpo e anexa esse PDF, inclusive nos testes de envio. Atualizações
posteriores da newsletter não modificam a campanha. Registros históricos sem PDF
são completados a partir de seu HTML original ao baixar ou enviar.

Dependência: Puppeteer com Chrome instalado. Veja `.env.newsletter-pdf.example`.
Os testes de integração substituem o renderizador e o SMTP por implementações
simuladas; a revisão visual usa o renderizador real e arquivos locais.
