import { ApiProperty } from '@nestjs/swagger';

export class AcademicTitleResponseDto {
  @ApiProperty({
    example: '4b8d9b79-c928-4e6d-a983-4d00e9fd7f72',
  })
  id!: string;

  @ApiProperty({
    example: 'Doutor',
  })
  name!: string;

  @ApiProperty({
    example: 'Dr.',
  })
  abbreviation!: string;
}
