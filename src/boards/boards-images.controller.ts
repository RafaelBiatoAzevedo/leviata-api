import type { GalleryFile } from '../images/gallery-file';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { ImagesService } from '../images/images.service';
import { ImageMetadataDto } from '../images/DTOs/image-metadata.dto';
import { CreateGalleryImageDto } from '../images/DTOs/create-gallery-image.dto';
import { ImageResponseDto } from '../images/DTOs/image-response.dto';
import {
  galleryImagePipe,
  GALLERY_IMAGE_MAX_BYTES,
} from '../images/gallery-upload';

@UseGuards(JwtAuthGuard)
@Controller('boards/:id')
@ApiTags('Boards')
export class BoardsImagesController {
  constructor(private readonly images: ImagesService) {}

  @Public()
  @Get('images')
  @ApiOperation({ summary: 'List images' })
  @ApiOkResponse({ type: ImageResponseDto, isArray: true })
  listImages(@Param('id', ParseUUIDPipe) id: string) {
    return this.images.list('board', id);
  }

  @ApiBearerAuth()
  @Post('images')
  @UseInterceptors(
    FileInterceptor('image', { limits: { fileSize: GALLERY_IMAGE_MAX_BYTES } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateGalleryImageDto })
  @ApiOperation({ summary: 'Upload gallery image to Cloudinary' })
  @ApiCreatedResponse({ type: ImageResponseDto })
  uploadImages(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile(galleryImagePipe) image: GalleryFile,
    @Body() dto: ImageMetadataDto,
  ) {
    return this.images.upload('board', id, image, dto);
  }

  @ApiBearerAuth()
  @Patch('images/:imageId')
  @ApiOperation({ summary: 'Update optional image title and description' })
  @ApiOkResponse({ type: ImageResponseDto })
  updateImages(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @Body() dto: ImageMetadataDto,
  ) {
    return this.images.update('board', id, imageId, dto);
  }

  @ApiBearerAuth()
  @Delete('images/:imageId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove gallery image and its Cloudinary file' })
  @ApiNoContentResponse()
  removeImages(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ) {
    return this.images.remove('board', id, imageId);
  }
}
