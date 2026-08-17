import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NewsCategory, NewsRelatedType } from '@prisma/client';

export class NewsResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({
    example: 'novo-projeto-de-pesquisa-leviata',
  })
  slug!: string;

  @ApiProperty({
    example: 'Novo projeto de pesquisa do grupo Leviatã',
  })
  title!: string;

  @ApiProperty({
    example:
      'O grupo Leviatã inicia um novo projeto de pesquisa sobre história e memória.',
  })
  description!: string;

  @ApiPropertyOptional({
    example:
      'https://res.cloudinary.com/seu-cloud/image/upload/v123/leviata/news/novo-projeto-de-pesquisa-leviata.jpg',
    nullable: true,
  })
  cover!: string | null;

  @ApiProperty({
    example: '2026-08-17T14:00:00.000Z',
  })
  date!: Date;

  @ApiProperty({
    enum: NewsCategory,
    example: NewsCategory.RESEARCH,
  })
  category!: NewsCategory;

  @ApiProperty({
    example: false,
  })
  isInternal!: boolean;

  @ApiPropertyOptional({
    example: 'https://www.unicamp.br/noticias/novo-projeto',
    nullable: true,
  })
  externalUrl!: string | null;

  @ApiPropertyOptional({
    enum: NewsRelatedType,
    example: NewsRelatedType.PUBLICATION,
    nullable: true,
  })
  relatedType!: NewsRelatedType | null;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  relatedId!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
