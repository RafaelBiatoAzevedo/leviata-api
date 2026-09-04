import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ImageResponseDto } from 'src/images/DTOs/image-response.dto';
import { MeetingResponseDto } from 'src/meetings/DTOs/meeting-response.dto';
import { PersonResponseDto } from 'src/people/DTOs/person-response.dto';

export class PresentedWorkResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({
    example: 'historia-do-cativeiro-no-brasil',
  })
  slug!: string;

  @ApiProperty({
    example: 'História do Cativeiro no Brasil',
  })
  title!: string;

  @ApiProperty({
    example: '2026-09-15T14:00:00.000Z',
  })
  date!: Date;

  @ApiPropertyOptional({
    example: 'Auditório da Universidade',
    nullable: true,
  })
  location!: string | null;

  @ApiProperty({
    type: () => [ImageResponseDto],
  })
  images!: ImageResponseDto[];

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  meetingId!: string | null;

  @ApiPropertyOptional({
    type: () => MeetingResponseDto,
    nullable: true,
  })
  meeting!: MeetingResponseDto | null;

  @ApiProperty({
    type: () => [PersonResponseDto],
  })
  authors!: PersonResponseDto[];

  @ApiPropertyOptional({
    example: 'https://example.com/documento.pdf',
    nullable: true,
  })
  documentUrl!: string | null;

  @ApiPropertyOptional({
    example: 'https://eventos.unicamp.br/inscricao',
    nullable: true,
  })
  registrationUrl!: string | null;

  @ApiPropertyOptional({
    example: 'https://www.youtube.com/watch?v=abc123',
    nullable: true,
  })
  recordingUrl!: string | null;

  @ApiPropertyOptional({
    example: 'https://meet.google.com/abc-defg-hij',
    nullable: true,
  })
  meetingUrl!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
