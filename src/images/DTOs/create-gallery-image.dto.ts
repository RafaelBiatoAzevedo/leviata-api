import type { GalleryFile } from '../gallery-file';
import { ApiProperty } from '@nestjs/swagger';
import { ImageMetadataDto } from './image-metadata.dto';

export class CreateGalleryImageDto extends ImageMetadataDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  image!: GalleryFile;
}
