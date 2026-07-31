import { ApiProperty } from '@nestjs/swagger';

export class CountryResponseDto {
  @ApiProperty({
    example: '2a0d97f2-0c7f-4d36-b8d8-9e59d96dfdf9',
  })
  id!: string;

  @ApiProperty({
    example: 'BR',
  })
  code!: string;

  @ApiProperty({
    example: 'Brasil',
  })
  name!: string;
}
