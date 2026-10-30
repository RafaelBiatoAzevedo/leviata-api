# Bancas de progressão e conclusão de curso

`Board.type` classifica a banca em:

| Valor | Exibição | Finalidade |
| --- | --- | --- |
| `QUALIFICATION` | Banca de Qualificação | Validação do projeto e dos capítulos iniciais durante TCC, mestrado ou doutorado. |
| `DEFENSE` | Banca de Defesa | Exame final do TCC, dissertação ou tese para conclusão do curso e obtenção do título. |

## Contrato

- `POST /boards`: exige `type` válido, além dos campos existentes.
- `PATCH /boards/:id` e `PATCH /boards/slug/:slug`: permitem classificar uma banca ou trocar seu tipo. Omitir `type` preserva o valor atual; `null`, vazio e valores fora do enum são rejeitados.
- Respostas públicas, administrativas e paginadas incluem `type: QUALIFICATION | DEFENSE | null`.
- `GET /boards?type=QUALIFICATION` e `GET /boards/paginated?type=DEFENSE` filtram por tipo. Os totais da paginação usam o mesmo filtro da lista. Sem o filtro, todas as bancas ativas continuam visíveis, inclusive as antigas sem classificação.

A data continua em `Board.date`, com data e hora. Exemplo de criação:

```json
{
  "title": "Qualificação de mestrado",
  "type": "QUALIFICATION",
  "candidateId": "550e8400-e29b-41d4-a716-446655440000",
  "advisorId": "550e8400-e29b-41d4-a716-446655440001",
  "members": ["550e8400-e29b-41d4-a716-446655440002"],
  "date": "2026-10-30T14:35:00-03:00",
  "meetingUrl": "https://example.org/banca"
}
```

## Migration e compatibilidade

A migration `20261030120000_add_board_type` adiciona o enum `BoardType` e uma coluna nullable sem valor padrão. Não altera datas, participantes, slugs ou galerias. As bancas existentes recebem `null`, sem inferência pelo título; o admin exibe **Não informado** até a revisão. No portal, a etiqueta aparece somente quando o tipo está definido.

Na publicação, aplique as migrations e gere o cliente antes de iniciar a API atualizada:

```sh
yarn prisma migrate deploy
yarn prisma generate
yarn build
```

Publique a API antes do frontend, pois os novos cadastros enviam o campo `type`.

Em desenvolvimento, reinicie a API depois da migration e da geração do cliente. `yarn start` não acompanha alterações; use `yarn start:dev` para recarga durante o desenvolvimento. Fazer um build atualiza os arquivos em `dist`, mas não substitui os módulos que um processo Node já carregou.

Se o salvamento retornar `property type should not exist`, a API que recebeu o pedido ainda usa o DTO antigo. Confira o destino de `VITE_API_BASE_URL` e verifique se `CreateBoardDto` e `UpdateBoardDto` em `/docs-json` incluem a propriedade `type`. Reinicie ou publique a API correta; remover `type` do pedido perderia a classificação escolhida.

## Verificação

```sh
yarn test:boards
BOARDS_TEST_DATABASE_URL="postgresql://USUARIO:SENHA@localhost:5432/leviata_test" yarn test:boards:integration
```

O teste PostgreSQL exige a variável específica e não usa `DATABASE_URL`. Cria um schema aleatório, aplica as migrations, verifica a preservação de uma banca antiga e exercita criação, edição, consulta pública e paginação filtrada. Ao terminar, remove somente o schema que criou.
