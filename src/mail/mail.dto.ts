import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class MailTestDto {
  @ApiProperty({ example: 'destinatario@exemplo.com' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  to!: string;
}

export class MailTokenDto {
  @ApiProperty()
  @IsString()
  @Length(16, 1024)
  token!: string;
}

export class MailDeliveriesQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
