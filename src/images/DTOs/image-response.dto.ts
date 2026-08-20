import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ImageResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({
    example:
      'https://res.cloudinary.com/seu-cloud/image/upload/v123/leviata/images/exemplo.jpg',
  })
  imageUrl!: string;

  @ApiPropertyOptional({
    example: 'Imagem registrada durante o seminário.',
    nullable: true,
  })
  description!: string | null;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  boardId!: string | null;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440001',
    nullable: true,
  })
  juryId!: string | null;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440002',
    nullable: true,
  })
  meetingId!: string | null;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440003',
    nullable: true,
  })
  presentedWorkId!: string | null;

  @ApiProperty()
  createdAt!: Date;
}
