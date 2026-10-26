import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateNewsletterDto } from './create-newsletter.dto';

export class CreateNewsletterWithCoverDto extends CreateNewsletterDto {
  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  cover?: Express.Multer.File;
}
