# Galerias de imagens

Bancas, júris, encontros, trabalhos apresentados e pesquisas têm galerias gerenciadas pelo painel administrativo. Pesquisas também têm uma coleção separada de imagens dos apoiadores (`supports`).

Antes de executar a API com os campos novos, aplique as migrações e gere o cliente:

```sh
npx prisma migrate deploy
npx prisma generate
```

O upload usa as mesmas variáveis existentes: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` e `CLOUDINARY_API_SECRET`. Os arquivos ficam no Cloudinary; o banco guarda `imageUrl`, `publicId`, título e descrição. Título e descrição são opcionais e podem ser apagados enviando `null` ou uma string vazia.

As rotas abaixo existem para cada recurso: `boards`, `juries`, `meetings`, `presented-works` e `research`.

| Método | Rota                                | Operação                                              |
| ------ | ----------------------------------- | ----------------------------------------------------- |
| GET    | `/{resource}/{id}/images`           | Listar as imagens publicamente                        |
| POST   | `/{resource}/{id}/images`           | Enviar `image`, `title` e `description` via multipart |
| PATCH  | `/{resource}/{id}/images/{imageId}` | Atualizar título e descrição via JSON                 |
| DELETE | `/{resource}/{id}/images/{imageId}` | Remover a imagem, com resposta 204                    |

Para apoiadores de uma pesquisa, substitua `images` por `supports` nas rotas de `research`. POST, PATCH e DELETE exigem autenticação JWT. A API verifica se a imagem pertence ao registro informado e se esse registro está ativo.

Formatos aceitos: JPEG, PNG, WebP, GIF e AVIF. Cada arquivo deve ter menos de 10 MB; o conteúdo do arquivo é validado além do tamanho. Os arquivos recebem identificadores únicos, separados das capas, sem depender do título ou slug do registro.

No painel, seleção de arquivos, mudanças nas legendas e remoções ficam pendentes até clicar em **Salvar**. O registro principal é salvo antes dos arquivos. Em caso de falha parcial, o formulário mantém o ID do registro e as imagens concluídas para permitir nova tentativa. As exclusões acontecem depois dos novos uploads.

Ao excluir uma imagem, o arquivo também é removido do Cloudinary quando há um `publicId` salvo. Imagens compartilhadas entre registros perdem somente o vínculo da galeria atual. Registros antigos continuam compatíveis com os campos novos nulos; arquivos antigos sem `publicId` exigem preencher esse identificador para permitir sua remoção do Cloudinary.

Os carrosséis públicos usam os dados da API. Fotos de bancas aparecem em `/agenda/bancas`, fotos de júris e encontros nas páginas de atividades e nos detalhes dos eventos, e pesquisas e trabalhos apresentados têm listagens e detalhes em `/atividades/pesquisas` e `/atividades/apresentacoes-trabalhos`. A página do núcleo “Em costas negras” utiliza as galerias de pesquisas cujo título ou slug contém “costas negras”.

Validação:

```sh
# Nesta API
npm run build
npm run test:gallery

# No projeto leviata (front)
npm run build
npm run test:gallery
```

Os testes da API simulam Prisma e Cloudinary; não fazem uploads nem alterações em serviços reais.
