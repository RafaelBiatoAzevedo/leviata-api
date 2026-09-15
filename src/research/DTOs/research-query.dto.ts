import { ApiPropertyOptional } from '@nestjs/swagger';

import { Type } from 'class-transformer';

import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ResearchQueryDto {
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
    description: 'Busca por slug ou conteúdo da pesquisa.',
    example: 'escravidão',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
