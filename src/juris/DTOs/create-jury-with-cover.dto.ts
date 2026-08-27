import { ApiProperty } from '@nestjs/swagger';
import { CreateJuryDto } from './create-jury.dto';

export class CreateJuryWithImageDto extends CreateJuryDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: false,
  })
  cover?: any;
}
