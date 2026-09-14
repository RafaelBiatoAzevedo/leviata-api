import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Transform } from 'class-transformer';

import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
} from 'class-validator';

import { ResearchInstrumentType } from '@prisma/client';

export class CreateResearchInstrumentDto {
  @ApiProperty({
    example: 'Dossiês sobre a escravidão no Brasil durante o período colonial',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiProperty({
    enum: ResearchInstrumentType,
    example: ResearchInstrumentType.DOSSIER,
  })
  @IsEnum(ResearchInstrumentType)
  type!: ResearchInstrumentType;

  @ApiPropertyOptional({
    description: 'Ano inicial do período abrangido pelo instrumento.',
    example: 1500,
  })
  @Transform(({ value }) =>
    value === '' || value === null ? undefined : Number(value),
  )
  @IsOptional()
  @IsInt()
  startYear?: number;

  @ApiPropertyOptional({
    description: 'Ano final do período abrangido pelo instrumento.',
    example: 1888,
  })
  @Transform(({ value }) =>
    value === '' || value === null ? undefined : Number(value),
  )
  @IsOptional()
  @IsInt()
  endYear?: number;

  @ApiPropertyOptional({
    description: 'Conteúdo ou descrição do instrumento de pesquisa.',
    example: 'Conjunto de documentos relacionados à escravidão...',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: 'URL externa relacionada ao instrumento.',
    example: 'https://atom.exemplo.com/dossie',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsOptional()
  @IsUrl()
  externalUrl?: string;

  @ApiProperty({
    description: 'IDs das pessoas relacionadas ao instrumento.',
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
}
