import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PersonResponseDto } from 'src/people/DTOs/person-response.dto';
import { VideoResponseDto } from 'src/videos/DTOs/video-response.dto';
import { ThematicVideoResponseDto } from './thematic-video-response.dto';

export class ThematicResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    example: 'defesa-mestrado-joao-silva',
  })
  slug!: string;

  @ApiProperty({
    example: 'Defesa de Mestrado - João Silva',
  })
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  mainVideoId!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: () => VideoResponseDto,
  })
  mainVideo!: VideoResponseDto | null;

  @ApiPropertyOptional({
    nullable: true,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  coordinatorId!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: () => PersonResponseDto,
  })
  coordinator!: PersonResponseDto | null;

  @ApiProperty({
    type: () => [ThematicVideoResponseDto],
    description: 'Videos relacionadas à temática.',
  })
  additionalVideos!: ThematicVideoResponseDto[];

  @ApiProperty({
    example: '2026-08-19T10:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2026-08-19T10:30:00.000Z',
  })
  updatedAt!: Date;
}
