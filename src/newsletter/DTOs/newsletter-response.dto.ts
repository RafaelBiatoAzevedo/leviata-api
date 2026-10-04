import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NewsletterResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() title!: string;
  @ApiProperty() subject!: string;
  @ApiProperty() htmlContent!: string;
  @ApiPropertyOptional({ nullable: true }) coverUrl?: string | null;
  @ApiPropertyOptional({ nullable: true }) pdfUrl?: string | null;
  @ApiPropertyOptional({ nullable: true }) publishedAt?: Date | null;
  @ApiPropertyOptional({ nullable: true }) sentAt?: Date | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
