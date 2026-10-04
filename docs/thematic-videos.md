# Vídeos das temáticas

O modelo existente `ThematicVideo` é gerenciado pela lista `additionalVideos` nas rotas de criação/edição de `Thematic`. Cada item aponta para um vídeo já cadastrado em `/videos` e pode incluir uma pessoa cadastrada em `/people`.

```json
{
  "title": "Cativeiro, saúde e alimentação",
  "mainVideoId": null,
  "coordinatorId": null,
  "additionalVideos": [
    {
      "videoId": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Saúde no cativeiro",
      "description": "Apresentação da pesquisa.",
      "personId": null
    }
  ]
}
```

`POST /thematics` cria a temática e os vínculos em uma operação aninhada do Prisma. O título de cada vínculo é obrigatório (até 255 caracteres); descrição (até 1000 caracteres) e pessoa são opcionais. Vídeo principal e coordenador também podem ser omitidos, conforme o modelo.

`PATCH /thematics/:id` e `PATCH /thematics/slug/:slug` aceitam o mesmo formato. Informe o `id` do vínculo para editá-lo e omita o `id` para adicionar um novo. A lista enviada substitui a lista anterior: itens omitidos são removidos; `[]` remove todos; omitir `additionalVideos` preserva a lista. Inclusões, edições e remoções são gravadas junto com a temática de forma atômica. A remoção do vínculo preserva o vídeo no catálogo.

IDs de vínculos de outra temática, IDs repetidos e referências a vídeos/pessoas inexistentes ou excluídos são rejeitados. Descrição vazia e pessoa ausente limpam esses campos do vínculo.

`GET /thematics`, `GET /thematics/:id` e `GET /thematics/slug/:slug` são públicos e retornam os vídeos e as pessoas relacionadas. Temáticas e vídeos excluídos não são exibidos; pessoas excluídas são retornadas como `null`. Criação, edição, exclusão e listagem paginada do painel exigem autenticação.

O front permite gerenciar os itens no formulário da temática e exibe os vídeos na visualização do painel e na página pública. Os cards da página inicial e das linhas temáticas usam os registros da API. Não há alteração de schema nem migration adicional.
