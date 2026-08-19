import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PersonResponseDto } from 'src/people/DTOs/person-response.dto';

export class BoardResponseDto {
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

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  candidateId!: string;

  @ApiProperty({
    type: () => PersonResponseDto,
  })
  candidate!: PersonResponseDto;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  advisorId!: string;

  @ApiProperty({
    type: () => PersonResponseDto,
  })
  advisor!: PersonResponseDto;

  @ApiProperty({
    example: '2026-08-19T14:00:00.000Z',
  })
  date!: Date;

  @ApiPropertyOptional({
    example: 'https://meet.google.com/abc-defg-hij',
  })
  meetingUrl?: string;

  @ApiProperty({
    type: () => [PersonResponseDto],
  })
  members!: PersonResponseDto[];

  @ApiPropertyOptional({
    type: 'array',
    description: 'Imagens relacionadas à banca.',
  })
  images?: any[];

  @ApiProperty({
    example: '2026-08-19T10:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2026-08-19T10:30:00.000Z',
  })
  updatedAt!: Date;
}
