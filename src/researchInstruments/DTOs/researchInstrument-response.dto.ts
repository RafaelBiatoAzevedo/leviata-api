import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ResearchInstrumentType } from '@prisma/client';
import { PersonResponseDto } from 'src/people/DTOs/person-response.dto';

export class ResearchInstrumentResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    example: 'dossies-da-escravidao',
  })
  slug!: string;
  @ApiProperty({
    example: 'Dossiês sobre a escravidão no Brasil durante o período colonial',
  })
  title!: string;

  @ApiProperty({
    enum: ResearchInstrumentType,
    example: ResearchInstrumentType.DOSSIER,
  })
  type!: ResearchInstrumentType;

  @ApiPropertyOptional({
    example: 1500,
    nullable: true,
  })
  startYear!: number | null;

  @ApiPropertyOptional({
    example: 1888,
    nullable: true,
  })
  endYear!: number | null;

  @ApiPropertyOptional({
    example: 'Conjunto de documentos relacionados à escravidão...',
    nullable: true,
  })
  content!: string | null;

  @ApiPropertyOptional({
    example: 'https://cdn.exemplo.com/instrumentos/dossie.pdf',
    nullable: true,
  })
  pdfUrl!: string | null;

  @ApiPropertyOptional({
    example: 'https://atom.exemplo.com/dossie',
    nullable: true,
  })
  externalUrl!: string | null;

  @ApiProperty({
    description: 'Pessoas relacionadas ao instrumento.',
    type: [PersonResponseDto],
  })
  people!: PersonResponseDto[];

  @ApiProperty({
    example: '2026-09-14T12:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2026-09-14T12:00:00.000Z',
  })
  updatedAt!: Date;
}
