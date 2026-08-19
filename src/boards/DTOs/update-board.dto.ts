import { PartialType } from '@nestjs/swagger';

import { CreateArticleDto } from 'src/articles/DTOs/create-article.dto';

export class UpdateArticleDto extends PartialType(CreateArticleDto) {}
