import { ApiProperty } from '@nestjs/swagger';

export class UploadImageResponseDto {
  @ApiProperty({
    example: 'leviata/people/larissa-biato',
  })
  publicId!: string;

  @ApiProperty({
    example:
      'https://res.cloudinary.com/seu-cloud/images/upload/v1754460000/leviata/images/people/larissa-biato.jpg',
  })
  url!: string;
}
