import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ImageResponseDto } from 'src/images/DTOs/image-response.dto';
import { PersonResponseDto } from 'src/people/DTOs/person-response.dto';

export class JuryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({
    example: 'julgamento-dissertacao-historia-cativeiro',
  })
  slug!: string;

  @ApiProperty({
    example: 'Julgamento de Dissertação - História do Cativeiro',
  })
  title!: string;

  @ApiPropertyOptional({
    example:
      'https://res.cloudinary.com/seu-cloud/image/upload/v123/leviata/juries/julgamento-dissertacao-historia-cativeiro.jpg',
    nullable: true,
  })
  coverUrl!: string | null;

  @ApiProperty({
    example: '2026-09-15T14:00:00.000Z',
  })
  date!: Date;

  @ApiProperty({
    type: () => [ImageResponseDto],
  })
  images!: ImageResponseDto[];

  @ApiProperty({
    type: () => [PersonResponseDto],
  })
  judges!: PersonResponseDto[];

  @ApiProperty({
    type: () => [PersonResponseDto],
  })
  jurors!: PersonResponseDto[];

  @ApiProperty({
    type: () => [PersonResponseDto],
  })
  prosecutors!: PersonResponseDto[];

  @ApiProperty({
    type: () => [PersonResponseDto],
  })
  defenders!: PersonResponseDto[];

  @ApiProperty({
    type: () => [PersonResponseDto],
  })
  bailiffs!: PersonResponseDto[];

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
