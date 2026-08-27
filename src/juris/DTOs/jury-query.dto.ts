import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class JuriesQueryDto {
  @ApiPropertyOptional({
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    example: 'dissertação',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Filtra pelos juízes da banca.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  judgeId?: string;

  @ApiPropertyOptional({
    description: 'Filtra pelos jurados da banca.',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsOptional()
  @IsUUID()
  jurorId?: string;

  @ApiPropertyOptional({
    description: 'Filtra pelos promotores da banca.',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsOptional()
  @IsUUID()
  prosecutorId?: string;

  @ApiPropertyOptional({
    description: 'Filtra pelos defensores da banca.',
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  @IsOptional()
  @IsUUID()
  defenderId?: string;

  @ApiPropertyOptional({
    description: 'Filtra pelos oficiais de justiça da banca.',
    example: '550e8400-e29b-41d4-a716-446655440004',
  })
  @IsOptional()
  @IsUUID()
  bailiffId?: string;

  @ApiPropertyOptional({
    example: 'date',
    enum: ['title', 'date', 'createdAt'],
    default: 'date',
  })
  @IsOptional()
  @IsString()
  @IsIn(['title', 'date', 'createdAt'])
  sortBy?: 'title' | 'date' | 'createdAt';

  @ApiPropertyOptional({
    example: 'desc',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
