# Comentários e notificações

Comentários públicos exigem nome completo (3 a 120 caracteres, pelo menos duas palavras) e texto (3 a 300 caracteres). São armazenados como `PENDING`, junto a uma notificação administrativa, em uma única transação. O portal consulta apenas comentários `APPROVED`. Nomes e textos são renderizados como texto, sem HTML.

Um administrador pode ler os comentários na central `/admin/notificacoes`. Apenas `SUPER_ADMIN` pode aprovar ou recusar. Aprovar registra o responsável e a data; recusar apaga fisicamente o comentário. A notificação mantém somente o resultado da revisão e a referência à página, sem copiar nome ou mensagem. A moderação usa operações condicionais para impedir que ações simultâneas apaguem um comentário aprovado.

| `targetType` | Modelo | Cobertura no portal |
| --- | --- | --- |
| `THEMATIC` | Thematic | Detalhes de linhas temáticas |
| `RESEARCH_INSTRUMENT` | ResearchInstrument | Dossiês, catálogos e bancos de dados |
| `BOARD` | Board | Detalhes de bancas |
| `JURY` | Jury | Júris históricos |
| `MEETING` | Meeting | Encontros, seminários e documentários |
| `PRESENTED_WORK` | PresentedWork | Apresentações de trabalhos |
| `RESEARCH` | Search | Pesquisas e núcleo “Em costas negras” |
| `NEWS` | News | Detalhes de todas as notícias, internas e externas |

O `targetId` é sempre o UUID do registro, mesmo quando a URL pública usa um slug. Registros inexistentes ou excluídos não aceitam envios nem permitem listagem pública ou aprovação. Ainda é possível recusar comentários de registros excluídos.

As notícias usam o mesmo formulário, limite de 300 caracteres, carrossel e moderação dos demais conteúdos. As notificações levam à própria notícia em `/noticias/:slug`; comentários sobre uma notícia ficam separados daqueles do conteúdo relacionado a ela. Para habilitar esse tipo no banco, aplicar também a migration `20261025120000_add_news_comment_target` e gerar novamente o cliente Prisma.

## API

| Método e rota | Acesso | Comportamento |
| --- | --- | --- |
| `POST /comments` | Público | `{ targetType, targetId, fullName, text }`; envia para revisão |
| `GET /comments` | Público | `targetType`, `targetId`, `page=1`, `limit=30` (máximo 60); retorna `{ items, total, page, limit }` |
| `PATCH /comments/:id/moderation` | Superadmin | `{ decision: "approve" ou "reject" }` |
| `GET /notifications` | Admin / superadmin | Paginação, `type=INFO/REMINDER/COMMENT`, `status=all/unread/pending/scheduled` |
| `GET /notifications/counts` | Admin / superadmin | `{ unreadCount, pendingCount }` |
| `GET /notifications/:id` | Admin / superadmin | Detalhes, comentário relacionado e leitura do usuário atual |
| `POST /notifications` | Admin / superadmin | `{ type: "INFO" ou "REMINDER", title, message, visibleAt? }` |
| `PATCH /notifications/:id/read` | Admin / superadmin | Registra leitura individual, de maneira idempotente |
| `PATCH /notifications/read-all` | Admin / superadmin | Marca somente notificações já visíveis como lidas para o usuário atual |

Avisos e lembretes são compartilhados pela equipe administrativa. O título aceita até 120 caracteres e a mensagem até 500. `visibleAt` é exclusivo de lembretes e deve incluir fuso horário (ex.: `2026-12-01T09:00:00-03:00`). Lembretes futuros aparecem em **Agendadas** e não entram no badge antes da hora. O sino atualiza os contadores a cada 30 segundos e quando a janela recebe foco. A leitura de um administrador não altera a dos demais; ler uma solicitação não a aprova.

O carrossel no fim dos detalhes mostra 3 cartões por grupo a partir de 900px de largura disponível, 2 a partir de 600px e 1 nas telas menores. Há paginação, navegação acessível, carregamento de mais comentários e tratamento de erro sem descartar o texto digitado.

O envio público aceita até 5 tentativas por minuto por IP, em memória por instância da API. Em instalações com múltiplas instâncias, um limite global pode ser configurado no proxy. A identificação usa o IP resolvido pelo Express; não confia diretamente em cabeçalhos encaminhados pelo cliente.

## Instalação e validação

Na API, aplicar a migration e gerar o cliente antes de iniciar:

```sh
npx prisma migrate deploy
npx prisma generate
npm run build
npm test -- --runInBand --testPathPatterns='comments/|notifications/'
```

Teste HTTP com PostgreSQL e JWT reais, usando **um banco de teste separado**, já migrado:

```sh
COMMENTS_TEST_DATABASE_URL='postgresql://usuario:senha@localhost:5432/leviata_test' npx jest --config test/jest-comments-e2e.json --runInBand
```

Essa suíte cria registros com identificadores únicos e remove apenas seus próprios dados. Não usa automaticamente o `DATABASE_URL` do projeto. Sem `COMMENTS_TEST_DATABASE_URL`, a suíte é ignorada.

No front:

```sh
npm run build
node --test --test-isolation=none test/comments-notifications.test.cjs
```

## Validação realizada em 24/10/2026

- Builds da API e do front concluídos. ESLint dos arquivos novos e dos arquivos de implementação alterados passou.
- Os 50 testes do recurso passaram: 36 testes de API/validação, 9 de front (incluindo interação do formulário) e 5 testes HTTP com PostgreSQL e JWT reais.
- As 33 migrations foram aplicadas em um PostgreSQL temporário. A suíte HTTP validou todos os três tipos de instrumento, todos os três tipos de encontro, os demais modelos de atividade, exclusão definitiva, leitura independente e concorrência na moderação. O servidor temporário foi encerrado ao concluir; o banco configurado no projeto não foi alterado.
- A conexão Prisma usa UTC e encerra o pool ao desligar. Isso foi necessário para manter leitura em lote, consultas Prisma e lembretes consistentes mesmo com o PostgreSQL configurado em outro fuso.
- A suíte geral da API teve 259 testes aprovados e 17 falhas em testes anteriores de `should be defined`, que instanciam controllers/services sem registrar suas dependências no módulo de teste.
- As suítes do front foram executadas separadamente porque algumas registram carregadores globais de TypeScript. Passaram navegação, portal, responsividade administrativa, apresentações, formulário de comentários e as demais suítes, exceto os 4 testes anteriores de `news-gallery-form.test.cjs`, cujo carregador CommonJS encontra `import.meta.env` sem mock. Esses testes não importam o novo fluxo de comentários/notificações.
- A verificação visual em navegador ficou pendente: esta sessão não disponibiliza um navegador de automação. Os breakpoints e os comportamentos de formulário foram verificados em testes e na compilação.

## Ampliação para notícias em 25/10/2026

- Migration de `NEWS` aplicada no PostgreSQL temporário, sem alterar o banco configurado no projeto.
- 89 testes das suítes relacionadas passaram: 38 de comentários/notificações na API, 33 do portal, 11 do formulário de comentários e 7 HTTP com PostgreSQL/JWT reais.
- Validado o envio em notícias internas e externas, ocultação antes da aprovação, acesso do administrador à mensagem e ao link da notícia, moderação exclusiva de superadmin, exclusão na recusa e bloqueio após excluir a notícia.
- Builds e lint dos arquivos de implementação alterados passaram. O PostgreSQL temporário foi encerrado ao concluir.
