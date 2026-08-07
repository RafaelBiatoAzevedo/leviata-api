import { ApiProperty } from '@nestjs/swagger';
import { CreateBookDto } from './create-book.dto';

export class CreateBookWithImageDto extends CreateBookDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: false,
  })
  coverUrl?: any;
}
