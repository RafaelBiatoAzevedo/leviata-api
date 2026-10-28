import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  ArrayMinSize,
  ArrayMaxSize,
  ArrayUnique,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateIf,
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

export class MailAudienceQueryDto extends MailDeliveriesQueryDto {
  @ApiPropertyOptional({ description: 'Pesquisar por nome ou e-mail.' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(200)
  search?: string;
}

export class MailSendDto {
  @ApiPropertyOptional({ enum: ['ALL', 'SELECTED'], default: 'ALL' })
  @IsIn(['ALL', 'SELECTED'])
  mode: 'ALL' | 'SELECTED' = 'ALL';

  @ApiPropertyOptional({
    type: [String],
    description: 'IDs dos inscritos, obrigatório no modo SELECTED.',
  })
  @ValidateIf(
    (dto: MailSendDto, value: unknown) =>
      dto.mode === 'SELECTED' || value !== undefined,
  )
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5000)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  subscriberIds?: string[];
}
