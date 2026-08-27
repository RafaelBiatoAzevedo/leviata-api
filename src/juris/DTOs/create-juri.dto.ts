import {
  ArrayMinSize,
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
import { Transform } from 'class-transformer';

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

  @ApiProperty({
    example: 2025,
  })
  @Transform(({ value }) =>
    value === '' || value === null ? undefined : Number(value),
  )
  @IsInt()
  @Min(0)
  year!: number;

  @ApiProperty({
    example: 'Editora Unicamp',
  })
  @IsString()
  @MaxLength(255)
  publisher!: string;

  @ApiProperty({
    example: 'https://editora.com/livro/leviata',
  })
  @IsUrl()
  externalUrl!: string;

  @ApiProperty({
    description: 'IDs dos autores do livro.',
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
