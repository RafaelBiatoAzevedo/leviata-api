import { ImageResponseDto } from '../../images/DTOs/image-response.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    example: 'Pesquisa escravidão e estado moderno',
  })
  title!: string;

  @ApiProperty({
    example: 'pesquisa-escravidao-e-estado-moderno',
  })
  slug!: string;

  @ApiPropertyOptional({
    description: 'URL da imagem de capa da pesquisa.',
    example: 'https://cdn.exemplo.com/search/capa.jpg',
    nullable: true,
  })
  coverUrl!: string | null;

  @ApiPropertyOptional({
    description: 'Public ID da imagem de capa no Cloudinary.',
    example: 'leviata/research/pesquisa-escravidao-e-estado-moderno',
    nullable: true,
  })
  coverPublicId!: string | null;

  @ApiPropertyOptional({
    description: 'Conteúdo ou descrição da pesquisa.',
    example:
      'Pesquisa dedicada ao estudo das relações entre Estado Moderno e escravidão.',
    nullable: true,
  })
  content!: string | null;

  @ApiProperty({
    description: 'Pessoas relacionadas à pesquisa.',
    type: [Object],
    example: [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        firstName: 'João',
        lastName: 'Silva',
      },
    ],
  })
  people!: {
    id: string;
    firstName: string;
    lastName: string;
  }[];

  @ApiProperty({ type: () => [ImageResponseDto] })
  images!: ImageResponseDto[];

  @ApiProperty({ type: () => [ImageResponseDto] })
  supports!: ImageResponseDto[];

  @ApiProperty({
    example: '2026-09-14T12:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2026-09-14T12:00:00.000Z',
  })
  updatedAt!: Date;
}
