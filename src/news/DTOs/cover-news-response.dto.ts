import { ApiProperty } from '@nestjs/swagger';

export class CoverNewsResponseDto {
  @ApiProperty({
    example: 'leviata/news/news-teste',
  })
  publicId!: string;

  @ApiProperty({
    example:
      'https://res.cloudinary.com/seu-cloud/images/upload/v1754460000/leviata/images/news/news-teste.jpg',
  })
  url!: string;
}
