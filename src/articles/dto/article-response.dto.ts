import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArticleType } from '@prisma/client';
import { PersonResponseDto } from 'src/people/dto/person-response.dto';

export class ArticleResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({
    example: 'historia-do-cativeiro-no-brasil',
  })
  slug!: string;

  @ApiProperty({
    example: 'A História do Cativeiro no Brasil',
  })
  title!: string;

  @ApiPropertyOptional({
    example:
      'https://res.cloudinary.com/seu-cloud/image/upload/v123/leviata/images/articles/historia-do-cativeiro-no-brasil.jpg',
    nullable: true,
  })
  cover!: string | null;

  @ApiProperty({
    enum: ArticleType,
    example: ArticleType.ARTICLE,
  })
  type!: ArticleType;

  @ApiPropertyOptional({
    example: 'Revista Brasileira de História',
    nullable: true,
  })
  journal!: string | null;

  @ApiPropertyOptional({
    example: '12',
    nullable: true,
  })
  volume!: string | null;

  @ApiPropertyOptional({
    example: 2025,
    nullable: true,
  })
  year!: number | null;

  @ApiPropertyOptional({
    example: '10.1234/exemplo.2025',
    nullable: true,
  })
  doi!: string | null;

  @ApiPropertyOptional({
    example:
      'Este artigo analisa as relações sociais e políticas relacionadas ao cativeiro.',
    nullable: true,
  })
  summary!: string | null;

  @ApiPropertyOptional({
    example: 'https://revista.com/artigo/historia-cativeiro',
    nullable: true,
  })
  externalUrl!: string | null;

  @ApiProperty({
    type: () => [PersonResponseDto],
  })
  authors!: PersonResponseDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
