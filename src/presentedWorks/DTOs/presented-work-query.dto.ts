import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PresentedWorksQueryDto {
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
    description: 'Quantidade de trabalhos por página.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    example: 'história',
    description: 'Busca por título ou outros campos textuais.',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: '2026-01-01',
    description: 'Data inicial do período de busca.',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2026-12-31',
    description: 'Data final do período de busca.',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filtra trabalhos vinculados a um encontro específico.',
  })
  @IsOptional()
  @IsUUID('4')
  meetingId?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Filtra trabalhos de um determinado autor.',
  })
  @IsOptional()
  @IsUUID('4')
  authorId?: string;

  @ApiPropertyOptional({
    example: 'date',
    enum: ['title', 'date', 'createdAt'],
    default: 'date',
    description: 'Campo utilizado para ordenação.',
  })
  @IsOptional()
  @IsIn(['title', 'date', 'createdAt'])
  sortBy?: 'title' | 'date' | 'createdAt';

  @ApiPropertyOptional({
    example: 'desc',
    enum: ['asc', 'desc'],
    default: 'desc',
    description: 'Direção da ordenação.',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
