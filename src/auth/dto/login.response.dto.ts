import { ApiProperty } from '@nestjs/swagger';

export class LoginUserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({
    nullable: true,
  })
  firstName?: string;

  @ApiProperty({
    nullable: true,
  })
  lastName?: string;

  @ApiProperty({
    example: 'SUPER_ADMIN',
  })
  role!: string;
}

export class LoginResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({
    example: 'Bearer',
  })
  tokenType!: string;

  @ApiProperty({
    type: LoginUserResponseDto,
  })
  user!: LoginUserResponseDto;
}
