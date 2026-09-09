import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class ThematicsQueryDto {
  @ApiPropertyOptional({
    example: 1,
    default: 1,
    description: 'Número da página.',
    type: Number,
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
    type: Number,
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
    description: 'Filtra pela pessoa coordenadora.',
  })
  @IsOptional()
  @IsUUID('4')
  coordinatorId?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filtra pelo vídeo principal.',
  })
  @IsOptional()
  @IsUUID('4')
  mainVideoId?: string;

  @ApiPropertyOptional({
    example: 'createdAt',
    default: 'createdAt',
    description: 'Campo utilizado para ordenação.',
    enum: ['title', 'createdAt', 'updatedAt'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    example: 'desc',
    default: 'desc',
    description: 'Direção da ordenação.',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}
