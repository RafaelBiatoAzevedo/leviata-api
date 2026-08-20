import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class BoardsQueryDto {
  @ApiPropertyOptional({
    example: 1,
    default: 1,
    description: 'Número da página.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    example: 10,
    default: 10,
    description: 'Quantidade de registros por página.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({
    example: 'defesa',
    description: 'Busca por título ou slug.',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filtra pela pessoa candidata.',
  })
  @IsOptional()
  @IsUUID('4')
  candidateId?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filtra pela pessoa orientadora.',
  })
  @IsOptional()
  @IsUUID('4')
  advisorId?: string;

  @ApiPropertyOptional({
    example: '2026-08-19',
    description: 'Filtra bancas a partir desta data.',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2026-12-31',
    description: 'Filtra bancas até esta data.',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
