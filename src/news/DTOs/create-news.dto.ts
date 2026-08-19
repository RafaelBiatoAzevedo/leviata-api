import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NewsCategory, NewsRelatedType } from '@prisma/client';
import { Transform } from 'class-transformer';

export class CreateNewsDto {
  @ApiProperty({
    example: 'Novo projeto de pesquisa do grupo Leviatã',
  })
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiProperty({
    example:
      'O grupo Leviatã inicia um novo projeto de pesquisa sobre história e memória.',
  })
  @IsString()
  description!: string;

  @ApiProperty({
    example: '1985-05-12',
  })
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  date!: string;

  @ApiProperty({
    enum: NewsCategory,
    example: NewsCategory.RESEARCH,
  })
  @IsEnum(NewsCategory)
  category!: NewsCategory;

  @ApiPropertyOptional({
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;

  @ApiPropertyOptional({
    example: 'https://www.unicamp.br/noticias/novo-projeto',
  })
  @IsOptional()
  @IsUrl()
  externalUrl?: string;

  @ApiPropertyOptional({
    enum: NewsRelatedType,
    example: NewsRelatedType.PUBLICATION,
  })
  @IsOptional()
  @IsEnum(NewsRelatedType)
  relatedType?: NewsRelatedType;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  relatedId?: string;
}
