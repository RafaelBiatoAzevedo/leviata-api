import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PersonResponseDto } from 'src/people/DTOs/person-response.dto';

export class VideoResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({
    example: 'Entrevista sobre História e Memória',
  })
  title!: string;

  @ApiProperty({
    example: 'https://www.youtube.com/embed/abc123',
  })
  embedLink!: string;

  @ApiPropertyOptional({
    example: 'Entrevista realizada com pesquisadores do grupo Leviatã.',
    nullable: true,
  })
  description?: string | null;

  @ApiProperty({
    type: [String],
    example: [
      '550e8400-e29b-41d4-a716-446655440000',
      '550e8400-e29b-41d4-a716-446655440001',
    ],
  })
  people?: PersonResponseDto[];

  @ApiProperty()
  createdAt!: Date;
}
