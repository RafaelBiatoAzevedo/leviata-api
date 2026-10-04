import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ThematicVideoInputDto } from './thematic-video-input.dto';

export class CreateThematicDto {
  @ApiProperty({
    example: 'Nome do temático',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({
    example: 'Descrição da temática.',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ApiPropertyOptional({
    description: 'ID do vídeo principal',
    nullable: true,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID('4')
  mainVideoId?: string | null;

  @ApiPropertyOptional({
    description: 'ID do coordenador',
    nullable: true,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID('4')
  coordinatorId?: string | null;

  @ApiPropertyOptional({
    description:
      'Vídeos vinculados à temática, com título, descrição e pessoa.',
    type: () => [ThematicVideoInputDto],
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ThematicVideoInputDto)
  additionalVideos?: ThematicVideoInputDto[];
}
