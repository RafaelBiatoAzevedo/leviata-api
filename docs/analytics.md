# Analytics do portal

Módulo opcional em `src/analytics`: provider PostgreSQL, consulta autenticada
`GET /analytics/report`, coletor anônimo separado `POST /analytics/collect`.
Não altera tabelas de conteúdo, usuários ou autenticação.

Decisão e guia completo no workspace frontend:
`leviata/docs/analytics-decision.md` e `leviata/docs/analytics.md`.

## Ativação

Aplicar a migration aditiva `20261028220000_add_anonymous_analytics`, gerar o
cliente Prisma e publicar o backend. Configurar `ANALYTICS_ENABLED=true`,
`ANALYTICS_ALLOWED_ORIGINS` com origens exatas e `ANALYTICS_MONTHLY_LIMIT=10000`.
Exemplos em `.env.analytics.example`. Configuração incompleta desativa o módulo
e retorna `not_configured` com `data: null`, sem bloquear o CMS.

No frontend, publicar com `VITE_ANALYTICS_ENABLED=true` e a URL real da API.
Nenhuma ativação, migration de ambiente ou publicação real foi realizada.
Não há credencial externa ou plano pago obrigatório para este provider.

## Manutenção

Janela de consulta de 180 dias, filtro de até 90 dias. Coleta elimina lotes
antigos de até cinco mil, até uma vez por minuto por processo com tráfego.
Para garantir exclusão também sem tráfego, agendar diariamente:

```sh
node scripts/analytics-retention.cjs
```

Usa `DATABASE_URL` e só exclui analytics antigo, até 100 mil por execução.
Registros expirados nunca são consultáveis, mesmo antes da exclusão física.
Monitore compute/armazenamento compartilhados. Não há promessa de infraestrutura
gratuita ilimitada. Desativar a coleta não apaga tabelas.

## Testes

```sh
npm run test:analytics
npx eslint src/analytics src/app.module.ts
npm run build
npx prisma validate
ANALYTICS_TEST_DATABASE_URL=postgresql://USUARIO@localhost:PORTA/BANCO_DESCARTAVEL npm run test:analytics:integration
```

O teste SQL usa só a variável específica, cria um schema aleatório e o remove
ao terminar. Não substitui ou apaga tabelas existentes.
