import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookDto {
  @ApiProperty({
    example: 'Leviatã e o Cativeiro',
  })
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({
    example: 'História, Memória e Sociedade',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  subtitle?: string;

  @ApiPropertyOptional({
    example:
      'Livro que aborda as pesquisas do grupo Leviatã sobre o cativeiro.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: '9788535933929',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  isbn?: string;

  @ApiPropertyOptional({
    example: 2025,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  year?: number;

  @ApiPropertyOptional({
    example: 'Editora Unicamp',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  publisher?: string;

  @ApiPropertyOptional({
    example: 'https://editora.com/livro/leviata',
  })
  @IsOptional()
  @IsUrl()
  externalUrl?: string;

  @ApiPropertyOptional({
    description: 'IDs dos autores do livro.',
    type: [String],
    example: [
      '550e8400-e29b-41d4-a716-446655440000',
      '550e8400-e29b-41d4-a716-446655440001',
    ],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  authorsIds?: string[];
}
