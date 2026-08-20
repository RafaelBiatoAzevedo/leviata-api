import { ApiProperty } from '@nestjs/swagger';
import { CreateArticleDto } from './create-meeting.dto';

export class CreateArticleWithImageDto extends CreateArticleDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: false,
  })
  cover?: any;
}
