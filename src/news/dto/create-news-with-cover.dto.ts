import { ApiProperty } from '@nestjs/swagger';
import { CreateNewsDto } from './create-news.dto';

export class CreateNewsWithImageDto extends CreateNewsDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: false,
  })
  cover?: any;
}
