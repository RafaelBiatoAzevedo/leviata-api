import { ApiPropertyOptional, PartialType, PickType } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateAccountDto extends PartialType(
  PickType(CreateUserDto, [
    'email',
    'firstName',
    'lastName',
    'password',
  ] as const),
  { skipNullProperties: false },
) {
  @ApiPropertyOptional({
    writeOnly: true,
    description: 'Required to change email or password.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(72)
  currentPassword?: string;
}
