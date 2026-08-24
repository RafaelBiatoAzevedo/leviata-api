import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MeetingType } from '@prisma/client';
import { ImageResponseDto } from 'src/images/DTOs/image-response.dto';
import { PersonResponseDto } from 'src/people/DTOs/person-response.dto';

export class MeetingResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({
    example: 'seminario-historia-e-memoria',
  })
  slug!: string;

  @ApiProperty({
    enum: MeetingType,
    example: MeetingType.SEMINAR,
  })
  type!: MeetingType;

  @ApiProperty({
    example: 'Seminário: História e Memória',
  })
  title!: string;

  @ApiPropertyOptional({
    example:
      'https://res.cloudinary.com/seu-cloud/image/upload/v123/leviata/meetings/seminario-historia-e-memoria.jpg',
    nullable: true,
  })
  coverUrl!: string | null;

  @ApiPropertyOptional({
    example:
      'Seminário sobre história, memória e as pesquisas desenvolvidas pelo grupo Leviatã.',
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({
    example: '2026-09-15T19:00:00.000Z',
  })
  date!: Date;

  @ApiPropertyOptional({
    example: 'Auditório da Universidade',
    nullable: true,
  })
  location!: string | null;

  @ApiPropertyOptional({
    example: 'https://eventos.unicamp.br/inscricao',
    nullable: true,
  })
  registrationUrl!: string | null;

  @ApiPropertyOptional({
    example: 'https://meet.google.com/abc-defg-hij',
    nullable: true,
  })
  meetingUrl!: string | null;

  @ApiProperty({
    type: () => [PersonResponseDto],
  })
  speakers!: PersonResponseDto[];

  @ApiProperty({
    type: () => [ImageResponseDto],
  })
  images!: ImageResponseDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
