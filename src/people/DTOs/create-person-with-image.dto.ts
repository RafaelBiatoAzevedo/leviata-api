import { ApiProperty } from '@nestjs/swagger';
import { CreatePersonDto } from './create-person.dto';

export class CreatePersonWithImageDto extends CreatePersonDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: false,
  })
  image?: any;
}
