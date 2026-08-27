import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { IUserJwt } from 'src/auth/jwt.strategy';
import { JuriesService } from './juries.service';
import { JuryResponseDto } from './DTOs/jury-response.dto';
import { CreateJuryDto } from './DTOs/create-jury.dto';
import { JuriesQueryDto } from './DTOs/jury-query.dto';
import { UpdateJuryDto } from './DTOs/update.juri.dto';
import { CreateJuryWithImageDto } from './DTOs/create-jury-with-cover.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { Public } from 'src/common/decorators/public.decorator';
import { UploadImageResponseDto } from 'src/images/DTOs/upload-image-response.dto';

@UseGuards(JwtAuthGuard)
@Controller('juries')
@ApiTags('Juries')
export class JuriesController {
  constructor(private readonly juriesService: JuriesService) {}

  @ApiBearerAuth()
  @Post()
  @UseInterceptors(FileInterceptor('cover'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    type: CreateJuryWithImageDto,
  })
  @ApiOperation({
    summary: 'Create jury',
  })
  @ApiCreatedResponse({
    description: 'Jury created successfully.',
    type: JuryResponseDto,
  })
  create(@Body() dto: CreateJuryDto, @UploadedFile() cover?: any) {
    return this.juriesService.create(dto, cover);
  }

  @Public()
  @Get()
  @ApiOperation({
    summary: 'List juries',
  })
  @ApiOkResponse({
    description: 'Juries retrieved successfully.',
    type: JuryResponseDto,
    isArray: true,
  })
  findAll(@Query() query: JuriesQueryDto) {
    return this.juriesService.findAll(query);
  }

  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({
    summary: 'Get jury by id',
  })
  @ApiParam({
    name: 'id',
    description: 'Jury id',
  })
  @ApiOkResponse({
    description: 'Jury retrieved successfully.',
    type: JuryResponseDto,
  })
  findOneById(@Param('id') id: string) {
    return this.juriesService.findOneById(id);
  }

  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({
    summary: 'Update jury',
  })
  @ApiParam({
    name: 'id',
    description: 'Jury id',
  })
  @ApiOkResponse({
    description: 'Jury updated successfully.',
    type: JuryResponseDto,
  })
  updateById(@Param('id') id: string, @Body() dto: UpdateJuryDto) {
    return this.juriesService.update(id, dto);
  }

  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({
    summary: 'Deactivate jury',
  })
  @ApiParam({
    name: 'id',
    description: 'Jury id',
  })
  @ApiNoContentResponse({
    description: 'Jury deleted successfully.',
  })
  removeById(
    @Param('id') id: string,
    @Req() req: Request & { user: IUserJwt },
  ) {
    return this.juriesService.remove(id, req.user);
  }

  @ApiBearerAuth()
  @Patch('slug/:slug/cover')
  @UseInterceptors(FileInterceptor('cover'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    type: CreateJuryWithImageDto,
  })
  @ApiOperation({
    summary: 'Upload jury cover',
  })
  @ApiParam({
    name: 'slug',
    description: 'Jury slug',
  })
  @ApiOkResponse({
    description: 'Jury cover uploaded successfully.',
    type: UploadImageResponseDto,
  })
  uploadCover(@Param('slug') slug: string, @UploadedFile() cover: any) {
    return this.juriesService.uploadCover(slug, cover);
  }

  @ApiBearerAuth()
  @Delete('slug/:slug/cover')
  @ApiOperation({
    summary: 'Remove jury cover',
  })
  @ApiParam({
    name: 'slug',
    description: 'Jury slug',
  })
  @ApiNoContentResponse({
    description: 'Jury cover removed successfully.',
  })
  removeImage(@Param('slug') slug: string) {
    return this.juriesService.removeCover(slug);
  }

  @ApiBearerAuth()
  @Get('slug/:slug')
  @ApiOperation({
    summary: 'Get jury by slug',
  })
  @ApiParam({
    name: 'slug',
    description: 'Jury slug',
    example: 'livro-teste',
  })
  @ApiOkResponse({
    description: 'Jury retrieved successfully.',
    type: JuryResponseDto,
  })
  findOneBySlug(@Param('slug') slug: string) {
    return this.juriesService.findOneBySlug(slug);
  }

  @ApiBearerAuth()
  @Patch('slug/:slug')
  @ApiOperation({
    summary: 'Update jury',
  })
  @ApiParam({
    name: 'slug',
    description: 'Jury slug',
    example: 'livro-teste',
  })
  @ApiOkResponse({
    description: 'Jury updated successfully.',
    type: JuryResponseDto,
  })
  updateBySlug(@Param('slug') slug: string, @Body() dto: UpdateJuryDto) {
    return this.juriesService.updateBySlug(slug, dto);
  }

  @ApiBearerAuth()
  @Delete('slug/:slug')
  @ApiOperation({
    summary: 'Deactivate jury',
  })
  @ApiParam({
    name: 'slug',
    description: 'Jury slug',
    example: 'livro-teste',
  })
  @ApiNoContentResponse({
    description: 'Jury deleted successfully.',
  })
  removeBySlug(
    @Param('slug') slug: string,
    @Req() req: Request & { user: IUserJwt },
  ) {
    return this.juriesService.removeBySlug(slug, req.user);
  }
}
