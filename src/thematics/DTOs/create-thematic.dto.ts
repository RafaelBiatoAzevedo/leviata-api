import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateThematicDto {
  @ApiProperty({
    example: 'Nome do temático',
  })
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({
    example: 'Descrição da temática.',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'ID do coordenador',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  mainVideoId!: string;

  @ApiProperty({
    description: 'ID do coordenador',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  coordinatorId!: string;

  @ApiPropertyOptional({
    description: 'IDs dos vídeos relacionados.',
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
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  additionalVideos?: string[];
}
