import { ApiPropertyOptional } from '@nestjs/swagger';

import { Type } from 'class-transformer';

import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import { ResearchInstrumentType } from '@prisma/client';

export class ResearchInstrumentsQueryDto {
  @ApiPropertyOptional({
    description: 'Número da página.',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Quantidade de registros por página.',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Busca por título ou slug.',
    example: 'escravidão',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filtra pelo tipo do instrumento de pesquisa.',
    enum: ResearchInstrumentType,
    example: ResearchInstrumentType.DOSSIER,
  })
  @IsOptional()
  @IsEnum(ResearchInstrumentType)
  type?: ResearchInstrumentType;

  @ApiPropertyOptional({
    description: 'Ano inicial do período.',
    example: 2019,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  startYear?: number;

  @ApiPropertyOptional({
    description: 'Ano final do período.',
    example: 2024,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  endYear?: number;
}
