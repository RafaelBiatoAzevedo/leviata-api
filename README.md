# Leviatã e o Cativeiro — API

Backend do **Leviatã e o Cativeiro**, portal institucional de pesquisa sobre Estado Moderno e escravidão.

A API gerencia o acervo acadêmico, pesquisadores, atividades, agenda, notícias, comentários e newsletters. Também atende o painel administrativo, controla autenticação e permissões, integra arquivos com o Cloudinary e fornece as estatísticas do Observatório.

**Frontend:** [leviata](https://github.com/RafaelBiatoAzevedo/leviata)

**Documentação interativa local:** `http://localhost:3000/docs`

**Contrato OpenAPI local:** `http://localhost:3000/docs-json`

## Conteúdo

- [Arquitetura](#arquitetura)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Como executar](#como-executar)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Autenticação e rotas](#autenticação-e-rotas)
- [Newsletter e PDF](#newsletter-e-pdf)
- [Observatório: analytics](#observatório-analytics)
- [Comandos e testes](#comandos-e-testes)
- [Publicação](#publicação)
- [Documentação complementar](#documentação-complementar)

## Arquitetura

```mermaid
flowchart LR
    P[Portal público React] -->|HTTPS / JSON| API[API NestJS]
    A[Admin React] -->|HTTPS / JWT| API
    API <-->|Prisma + pg| DB[(Neon / PostgreSQL)]
    API -->|Uploads| C[Cloudinary]
    API -->|Worker de newsletters| M[SMTP / Gmail]
    API -->|Renderização de PDF| PDF[Chrome / Puppeteer]
    P -->|Visualizações anônimas opcionais| API
```

O banco mantém conteúdo, relacionamentos, contas, fila de envio e estatísticas anônimas. Imagens e PDFs enviados são integrados ao Cloudinary; os PDFs gerados de newsletters são persistidos pelo módulo de newsletter.

A documentação HTML do sistema e a imagem da estrutura acompanham o frontend.

## Funcionalidades

| Área | Recursos |
| --- | --- |
| Autenticação e usuários | Login, refresh token, logout, conta ativa, revogação e perfis `ADMIN`/`SUPER_ADMIN` |
| Pessoas | Pesquisadores, integrantes do grupo e participantes externos |
| Acervo | Livros, artigos, dossiês, vídeos e instrumentos de pesquisa |
| Pesquisa | Linhas temáticas, projetos e trabalhos apresentados |
| Atividades | Júris históricos, bancas, encontros, seminários, simpósios e mostras de documentários |
| Agenda | Registros com datas, horários e vínculos com atividades |
| Notícias | Notícias internas ou externas, relacionamentos, capas e galerias |
| Galerias | Uploads e metadados das imagens vinculadas ao conteúdo |
| Comentários | Envio público, publicação de aprovados e moderação por superadmin |
| Notificações | Avisos administrativos e estado de leitura por usuário |
| Newsletters | Edições, composição, HTML, PDF, inscrições e campanhas de envio |
| Relatórios | Indicadores do acervo para o dashboard |
| Analytics | Coleta opcional e relatórios agregados do Observatório |
| Cadastros auxiliares | Países, instituições e títulos acadêmicos |

Os contratos completos de campos, filtros e respostas estão no Swagger da aplicação.

## Tecnologias

| Tecnologia | Uso |
| --- | --- |
| NestJS 11 + TypeScript 5 | Módulos, controllers e serviços |
| Express | Camada HTTP |
| Prisma 7 + adapter `pg` | Acesso ao PostgreSQL |
| PostgreSQL / Neon | Persistência |
| Passport + JWT + bcrypt | Autenticação e credenciais |
| class-validator + class-transformer | Validação e transformação dos DTOs |
| Swagger / OpenAPI | Documentação dos endpoints |
| Cloudinary + Multer | Uploads e arquivos |
| Nodemailer | Envio de e-mails |
| Puppeteer | Geração dos PDFs das newsletters |
| Jest + Supertest | Testes unitários e HTTP |

Versões e scripts: [package.json](package.json). A configuração do Prisma está em [prisma.config.ts](prisma.config.ts).

## Como executar

### Pré-requisitos

- Node.js **24.x**, utilizado na validação local do projeto.
- Yarn Classic **1.x**, compatível com o `yarn.lock` existente.
- Uma instância PostgreSQL acessível, local ou no Neon.
- Cloudinary para as funcionalidades de upload.
- Chrome/Chromium para gerar PDFs de newsletter.
- SMTP/OAuth2 para ativar os envios de e-mail.

E-mail e analytics são opcionais e podem permanecer desativados durante o desenvolvimento.

### 1. Instalar

```sh
git clone https://github.com/RafaelBiatoAzevedo/leviata-api.git
cd leviata-api
yarn install --frozen-lockfile
```

A instalação do Puppeteer pode baixar um binário do Chrome. Também é possível configurar um executável já instalado no ambiente.

### 2. Configurar o ambiente

Crie um arquivo `.env` na raiz, substituindo os valores de exemplo antes de executar:

```dotenv
NODE_ENV=development
PORT=3000

DATABASE_URL=postgresql://USUARIO:SENHA@localhost:5432/leviata

JWT_SECRET=SUBSTITUA_POR_UM_SEGREDO_EXCLUSIVO
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=SUBSTITUA_POR_OUTRO_SEGREDO_EXCLUSIVO
JWT_REFRESH_EXPIRES_IN=7d

MAIL_ENABLED=false
ANALYTICS_ENABLED=false
```

Use segredos diferentes para os tokens de acesso e de renovação. O `.env` é ignorado pelo Git; as credenciais devem ser fornecidas pelo ambiente de execução.

Para Neon, use a conexão informada pelo provedor, preservando os parâmetros de conexão e SSL necessários ao ambiente.

### 3. Preparar o banco

Com a conexão apontando para o banco desejado:

```sh
yarn prisma generate
yarn prisma migrate deploy
```

O projeto usa Prisma 7: a URL de conexão está em `prisma.config.ts`, e o schema fica em `prisma/schema.prisma`. Os comandos devem usar a versão instalada no repositório.

### 4. Carga inicial de desenvolvimento

O seed cadastra países, instituições, títulos acadêmicos e uma conta superadministradora:

```sh
yarn prisma db seed
```

Antes de executar, confira [prisma/seed.ts](prisma/seed.ts) e [o seed de superadmin](prisma/seeds/super-admin.seed.ts). A conta inicial utiliza valores de desenvolvimento definidos no código; adapte o provisionamento antes de utilizá-lo em outro ambiente, sem versionar segredos reais.

### 5. Iniciar

```sh
yarn start:dev
```

A API usa a porta `3000` por padrão. A raiz `/` redireciona para `/docs`.

## Variáveis de ambiente

### Banco, autenticação e arquivos

| Variável | Finalidade |
| --- | --- |
| `PORT` | Porta HTTP; padrão `3000` |
| `NODE_ENV` | Ambiente de execução; consulte as pendências de produção abaixo |
| `DATABASE_URL` | Conexão PostgreSQL |
| `JWT_SECRET` | Segredo de assinatura do access token |
| `JWT_EXPIRES_IN` | Duração do access token; padrão `1d` |
| `JWT_REFRESH_SECRET` | Segredo do refresh token |
| `JWT_REFRESH_EXPIRES_IN` | Duração do refresh token; padrão `7d` |
| `CLOUDINARY_CLOUD_NAME` | Identificação do ambiente Cloudinary |
| `CLOUDINARY_API_KEY` | Chave do Cloudinary, exclusiva do backend |
| `CLOUDINARY_API_SECRET` | Segredo do Cloudinary, exclusivo do backend |

As variáveis Cloudinary são necessárias para criar e atualizar os arquivos que usam essa integração.

### Configurações opcionais

| Arquivo de exemplo | Conteúdo |
| --- | --- |
| [.env.mail.example](.env.mail.example) | SMTP/Gmail, autenticação, remetente, worker e limites de envio |
| [.env.newsletter-pdf.example](.env.newsletter-pdf.example) | Executável do Chrome e opções de isolamento |
| [.env.analytics.example](.env.analytics.example) | Ativação, origens, cota e proxies confiáveis do analytics |

Copie somente as configurações necessárias desses exemplos para o `.env` ou para o painel do provedor. Os segredos pertencem à API e não devem ser publicados em variáveis `VITE_` do frontend.

## Autenticação e rotas

O login recebe e-mail e senha. Os endpoints protegidos usam:

```http
Authorization: Bearer SEU_ACCESS_TOKEN
```

As roles são `ADMIN` e `SUPER_ADMIN`. Gestão de outras contas e moderação de comentários possuem verificações específicas de superadmin. A própria conta pode ser consultada e atualizada pelas rotas correspondentes.

| Método e rota | Uso |
| --- | --- |
| `POST /auth/login` | Autenticar e obter os tokens |
| `POST /auth/refresh` | Renovar a sessão com o refresh token |
| `POST /auth/logout` | Encerrar a sessão autenticada |
| `GET /auth/me` | Consultar a identidade autenticada |
| `GET /users/me` | Consultar os dados da própria conta |
| `PATCH /users/me` | Atualizar a própria conta |
| `GET /reports/summary` | Consultar os indicadores do dashboard |
| `GET /mail/status` | Consultar a configuração de envio, com autenticação administrativa |
| `GET /analytics/report` | Consultar o Observatório, com JWT e permissão administrativa |
| `POST /analytics/collect` | Receber uma visualização anônima de rota pública permitida |

As rotas de conteúdo têm regras próprias para leitura pública e alterações administrativas. Consulte `/docs` para os DTOs e permissões de cada operação.

## Newsletter e PDF

O cadastro de edições e inscritos funciona com `MAIL_ENABLED=false`. Para enviar campanhas:

1. Configure SMTP/Gmail e o modo de autenticação em [.env.mail.example](.env.mail.example).
2. Defina `MAIL_UNSUBSCRIBE_SECRET`, mantendo a chave estável entre publicações.
3. Configure as URLs públicas do portal e da API.
4. Habilite `MAIL_ENABLED=true` e `MAIL_WORKER_ENABLED=true`.
5. Reinicie a API, verifique o status, valide a conexão e faça um envio de teste antes da campanha.

O worker usa uma fila persistida no PostgreSQL e executa dentro do processo da API. A hospedagem precisa manter esse processamento ativo ou receber uma adaptação explícita para outra estratégia de execução.

A geração de PDF depende de Chrome/Chromium disponível no ambiente. Use `NEWSLETTER_PDF_EXECUTABLE_PATH` quando precisar informar o binário. O padrão de `NEWSLETTER_PDF_NO_SANDBOX` é `false`; a opção de desativar o sandbox é destinada a ambientes isolados que realmente a exijam.

Guia detalhado: [e-mail e newsletters](docs/mail-newsletters.md).

## Observatório: analytics

O Observatório utiliza **analytics próprio**, com armazenamento no PostgreSQL. O módulo não depende de Vercel Web Analytics e começa desativado.

Exemplo para o ambiente publicado:

```dotenv
ANALYTICS_ENABLED=true
ANALYTICS_ALLOWED_ORIGINS=https://leviataeocativeiro.com.br,https://www.leviataeocativeiro.com.br
ANALYTICS_MONTHLY_LIMIT=10000
ANALYTICS_TRUST_PROXY_HOPS=0
```

- Aplique a migration de analytics antes da ativação.
- Informe origens exatas, separadas por vírgulas e sem barra final.
- Habilite também `VITE_ANALYTICS_ENABLED=true` no frontend e faça novo build.
- Ajuste `ANALYTICS_TRUST_PROXY_HOPS` somente após verificar a cadeia real de proxies confiáveis.

São armazenados o dia em São Paulo, modelo da rota, categoria de origem, tipo de dispositivo, família de navegador e UUID por visualização para deduplicação. A cota mensal é atômica no banco, e consultas usam cache de até cinco minutos.

Não há cookies de analytics, identificadores de visitantes, IPs ou User-Agents completos no banco de analytics. DNT, GPC e opt-out são respeitados. Logs da infraestrutura são independentes dessa coleta.

Visitantes únicos, sessões, páginas por sessão, países e presença online não são medidos. O histórico começa na ativação.

A janela de consulta é de 180 dias, com intervalos de até 90 dias. A coleta faz exclusões oportunistas; para limpar também durante períodos sem tráfego, agende a manutenção:

```sh
node scripts/analytics-retention.cjs
```

O comando usa `DATABASE_URL` e exclui somente analytics anterior à janela, em lotes limitados. Sem manutenção ou tráfego, registros antigos podem permanecer fisicamente no banco, mas ficam fora das consultas.

Guia do módulo: [docs/analytics.md](docs/analytics.md). O guia completo de implantação e a decisão de arquitetura estão no [repositório frontend](https://github.com/RafaelBiatoAzevedo/leviata/tree/main/docs).

## Comandos e testes

| Comando | Finalidade |
| --- | --- |
| `yarn start` | Compilar e iniciar pelo Nest CLI |
| `yarn start:dev` | Desenvolvimento com recarga |
| `yarn start:debug` | Desenvolvimento com depuração |
| `yarn build` | Compilar em `dist/` |
| `yarn start:prod` | Script de produção; requer os ajustes descritos abaixo |
| `yarn lint` | ESLint com `--fix`; pode modificar arquivos |
| `yarn format` | Formatação dos arquivos de código e teste |
| `yarn test --runInBand` | Suíte unitária geral |
| `yarn test:cov` | Relatório de cobertura |
| `yarn test:e2e` | Testes de ponta a ponta |
| `yarn test:gallery` | Galerias |
| `yarn test:boards` | Bancas: tipos, validação, edição e filtros |
| `yarn test:boards:integration` | Migration e persistência de bancas em PostgreSQL isolado |
| `yarn test:mail` | Envio de e-mail |
| `yarn test:mail:e2e` | Fluxos HTTP de e-mail |
| `yarn test:analytics` | Analytics: configuração, privacidade, filtros, JWT, cota e cache |
| `yarn test:analytics:integration` | Migration e comportamento SQL real em banco de teste |
| `yarn test:events:integration` | Integração de eventos |
| `yarn test:newsletter:integration` | Persistência das newsletters |
| `yarn test:newsletter-selection:integration` | Seleção de conteúdos para newsletters |

Use um banco dedicado para testes que exercitam persistência. Alguns scripts de integração usam a configuração de banco do ambiente; confira o próprio script antes de executar.

O teste SQL de analytics exige uma variável específica, sem recorrer ao `DATABASE_URL` da aplicação:

```sh
ANALYTICS_TEST_DATABASE_URL="postgresql://USUARIO:SENHA@localhost:5432/leviata_test" yarn test:analytics:integration
```

Ele cria um schema aleatório, valida deduplicação concorrente, agregações, cota, rollback e retenção, e remove esse schema ao terminar.

**Referência de validação em 29/10/2026:** a suíte geral apresentou 25 falhas em 18 suítes legadas, reproduzidas no código anterior; os 17 testes novos de analytics passaram separadamente. Consulte os guias dos módulos e os resultados do ambiente antes de considerar uma publicação validada.

## Publicação

Antes de publicar a API em um processo Node convencional, há dois ajustes pendentes no código atual:

1. [src/main.ts](src/main.ts) chama `app.listen()` somente quando `NODE_ENV` é diferente de `production`. O bootstrap precisa abrir a porta também no ambiente de produção pretendido.
2. O script `start:prod` aponta para `dist/main`, enquanto o build atual gera `dist/src/main.js`. O entrypoint precisa corresponder ao arquivo compilado.

A correção desses pontos deve anteceder o uso de `NODE_ENV=production`. A estrutura de saída do Nest depende dos arquivos incluídos na compilação, conforme a [documentação oficial de implantação](https://docs.nestjs.com/deployment).

Depois de adequar a execução:

- Configure os segredos e a conexão de produção no provedor.
- Aplique as migrations revisadas, gere o Prisma Client e faça o build.
- Configure HTTPS, porta e origens CORS do frontend; atualmente o bootstrap usa `app.enableCors()` sem uma lista restrita de origens.
- Disponibilize Chrome e as dependências do sistema para os PDFs.
- Garanta a execução do worker de e-mails quando habilitado.
- Valide login, upload, PDF e envio de teste no ambiente publicado.
- Ative analytics somente após configurar origem, capacidade do banco e manutenção de retenção.
- Monitore consumo, filas, logs e backups dos serviços utilizados.

## Organização do código

```text
src/
├── analytics/          # Coletor e relatórios de audiência
├── auth/               # JWT, sessão e login
├── users/              # Contas e permissões
├── people/             # Pessoas e vínculos acadêmicos
├── books/, articles/   # Publicações
├── research/           # Pesquisas
├── researchInstruments/# Instrumentos de pesquisa
├── meetings/, juris/   # Eventos e júris históricos
├── boards/, schedule/  # Bancas e agenda
├── newsletter/         # Edições e geração de PDFs
├── mail/               # SMTP, campanhas e worker
├── comments/           # Comentários e moderação
├── notifications/      # Avisos administrativos
├── cloudinary/, upload/# Integração de arquivos
├── prisma/             # Serviço de acesso ao banco
└── common/             # Guards, decorators e utilitários
prisma/
├── schema.prisma       # Modelos e enums
├── migrations/         # Histórico das migrations
├── data/               # Dados auxiliares
└── seeds/              # Cargas iniciais
scripts/                # Manutenção de analytics
test/                   # Testes HTTP e de integração
docs/                   # Guias dos módulos
```

## Documentação complementar

- [Usuários e permissões](docs/users.md)
- [Bancas: qualificação, defesa e publicação](docs/boards.md)
- [Comentários e notificações](docs/comments-notifications.md)
- [Galerias](docs/galleries.md)
- [Vídeos e temáticas](docs/thematic-videos.md)
- [E-mail e newsletters](docs/mail-newsletters.md)
- [Analytics](docs/analytics.md)
- [Documentação completa do projeto no frontend](https://github.com/RafaelBiatoAzevedo/leviata/tree/main/public/documentacao)
- [Prisma ORM 7](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7)

## Licença

O `package.json` declara `UNLICENSED`. Este repositório não contém um arquivo `LICENSE`; as dependências mantêm suas próprias licenças.
