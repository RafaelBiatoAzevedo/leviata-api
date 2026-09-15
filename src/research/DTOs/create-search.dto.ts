import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Transform } from 'class-transformer';

import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateSearchDto {
  @ApiProperty({
    example: 'Pesquisa escravidão e estado moderno',
  })
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({
    description: 'Conteúdo ou descrição da pesquisa.',
    example:
      'Pesquisa dedicada ao estudo das relações entre Estado Moderno e escravidão.',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({
    description: 'IDs das pessoas relacionadas à pesquisa.',
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
  people!: string[];

  @ApiPropertyOptional({
    description: 'IDs das imagens relacionadas à pesquisa.',
    type: [String],
    example: [
      '550e8400-e29b-41d4-a716-446655440002',
      '550e8400-e29b-41d4-a716-446655440003',
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
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  images?: string[];

  @ApiPropertyOptional({
    description: 'IDs das imagens utilizadas como apoio à pesquisa.',
    type: [String],
    example: [
      '550e8400-e29b-41d4-a716-446655440004',
      '550e8400-e29b-41d4-a716-446655440005',
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
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  supports?: string[];
}
