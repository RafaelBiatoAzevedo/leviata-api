import { ParseFilePipeBuilder } from '@nestjs/common';

export const GALLERY_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

export const galleryImagePipe = new ParseFilePipeBuilder()
  .addMaxSizeValidator({ maxSize: GALLERY_IMAGE_MAX_BYTES })
  .addFileTypeValidator({ fileType: /^image\/(jpeg|png|webp|gif|avif)$/ })
  .build({ fileIsRequired: true });
