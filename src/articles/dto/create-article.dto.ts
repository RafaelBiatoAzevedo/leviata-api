import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArticleType } from '@prisma/client';
import { Transform } from 'class-transformer';

export class CreateArticleDto {
  @ApiProperty({
    example: 'A História do Cativeiro no Brasil',
  })
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({
    example: 'ARTICLE',
    enum: ArticleType,
    default: ArticleType.ARTICLE,
  })
  @IsOptional()
  @IsEnum(ArticleType)
  type?: ArticleType;

  @ApiPropertyOptional({
    example: 'Revista Brasileira de História',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  journal?: string;

  @ApiPropertyOptional({
    example: '12',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  volume?: string;

  @ApiPropertyOptional({
    example: 2025,
  })
  @Transform(({ value }) =>
    value === '' || value === null ? undefined : Number(value),
  )
  @IsInt()
  @Min(0)
  year?: number;

  @ApiPropertyOptional({
    example: 'https://doi.org/10.1234/exemplo.2025',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  doi?: string;

  @ApiPropertyOptional({
    example:
      'Este artigo analisa as relações sociais e políticas relacionadas ao cativeiro.',
  })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({
    example: 'https://revista.com/artigo/historia-cativeiro',
  })
  @IsUrl()
  externalUrl!: string;

  @ApiPropertyOptional({
    description: 'IDs dos autores do artigo.',
    type: [String],
    example: [
      '550e8400-e29b-41d4-a716-446655440000',
      '550e8400-e29b-41d4-a716-446655440001',
    ],
  })
  @Transform(({ value }) => {
    if (typeof value !== 'string') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return value;
    }

    try {
      const parsed: unknown = JSON.parse(value);

      return Array.isArray(parsed) ? parsed : value;
    } catch {
      return value;
    }
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  authors!: string[];
}
