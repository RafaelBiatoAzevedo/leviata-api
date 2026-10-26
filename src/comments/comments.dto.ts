import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { CommentTarget } from '@prisma/client';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CommentTargetDto {
  @ApiProperty({ enum: CommentTarget })
  @IsEnum(CommentTarget)
  targetType!: CommentTarget;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  targetId!: string;
}

export class PublicCommentsQueryDto extends CommentTargetDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page: number = 1;

  @ApiPropertyOptional({ default: 30, maximum: 60 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  limit: number = 30;
}

export class CreateCommentDto extends CommentTargetDto {
  @ApiProperty({ maxLength: 120 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  @IsString()
  @Length(3, 120, { message: 'O nome deve ter entre 3 e 120 caracteres.' })
  @Matches(/^\S+\s+\S+/, { message: 'Informe seu nome completo.' })
  fullName!: string;

  @ApiProperty({ maxLength: 300 })
  @Transform(trim)
  @IsString()
  @Length(3, 300, {
    message: 'O comentário deve ter entre 3 e 300 caracteres.',
  })
  text!: string;
}

export class ModerateCommentDto {
  @ApiProperty({ enum: ['approve', 'reject'] })
  @IsEnum({ approve: 'approve', reject: 'reject' })
  decision!: 'approve' | 'reject';
}
