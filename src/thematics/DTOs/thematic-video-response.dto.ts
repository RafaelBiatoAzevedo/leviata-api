import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PersonResponseDto } from 'src/people/DTOs/person-response.dto';
import { VideoResponseDto } from 'src/videos/DTOs/video-response.dto';

export class ThematicVideoResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  thematicId!: string;

  @ApiProperty()
  videoId!: string;

  @ApiProperty()
  personId!: string | null;

  @ApiProperty({
    example: 'Entrevista sobre História e Memória',
  })
  title!: string;

  @ApiPropertyOptional({
    example: 'Entrevista complementar sobre o tema abordado.',
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({
    type: VideoResponseDto,
  })
  video!: VideoResponseDto;

  @ApiPropertyOptional({
    type: PersonResponseDto,
    nullable: true,
  })
  person!: PersonResponseDto | null;

  @ApiProperty()
  createdAt!: Date;
}
