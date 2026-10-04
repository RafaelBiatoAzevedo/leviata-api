import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ScheduleResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() title!: string;
  @ApiPropertyOptional({ nullable: true }) subtitle!: string | null;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty({ format: 'date-time' }) date!: Date;
  @ApiPropertyOptional({ nullable: true, format: 'date-time' })
  endDate!: Date | null;
  @ApiPropertyOptional({ nullable: true }) location!: string | null;
  @ApiPropertyOptional({ nullable: true }) externalUrl!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
