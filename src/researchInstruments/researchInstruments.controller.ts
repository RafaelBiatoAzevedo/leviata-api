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

import { Public } from 'src/common/decorators/public.decorator';
import { ResearchInstrumentsService } from './researchInstruments.service';
import { ResearchInstrumentResponseDto } from './DTOs/researchInstrument-response.dto';
import { ResearchInstrumentsQueryDto } from './DTOs/researchInstrument-query.dto';
import { UpdateResearchInstrumentDto } from './DTOs/update-researchInstrument.dto';
import { CreateResearchInstrumentDto } from './DTOs/create-researchInstrument.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateResearchInstrumentWithPdfDto } from './DTOs/create-researchInstrument-with-pdf.dto';
import { UploadImageResponseDto } from 'src/images/DTOs/upload-image-response.dto';

@UseGuards(JwtAuthGuard)
@Controller('researchInstruments')
@ApiTags('ResearchInstruments')
export class ResearchInstrumentsController {
  constructor(
    private readonly researchInstrumentsService: ResearchInstrumentsService,
  ) {}

  @ApiBearerAuth()
  @Post()
  @ApiBody({
    type: CreateResearchInstrumentDto,
  })
  @ApiOperation({
    summary: 'Create researchInstrument',
  })
  @ApiCreatedResponse({
    description: 'ResearchInstrument created successfully.',
    type: ResearchInstrumentResponseDto,
  })
  create(@Body() dto: CreateResearchInstrumentDto) {
    return this.researchInstrumentsService.create(dto);
  }

  @Public()
  @Get()
  @ApiOperation({
    summary: 'List researchInstruments',
  })
  @ApiOkResponse({
    description: 'ResearchInstruments retrieved successfully.',
    type: ResearchInstrumentResponseDto,
    isArray: true,
  })
  findAll(@Query() query: ResearchInstrumentsQueryDto) {
    return this.researchInstrumentsService.findAll(query);
  }

  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({
    summary: 'Get researchInstrument by id',
  })
  @ApiParam({
    name: 'id',
    description: 'ResearchInstrument id',
  })
  @ApiOkResponse({
    description: 'ResearchInstrument retrieved successfully.',
    type: ResearchInstrumentResponseDto,
  })
  findOneById(@Param('id') id: string) {
    return this.researchInstrumentsService.findOneById(id);
  }

  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({
    summary: 'Update researchInstrument',
  })
  @ApiParam({
    name: 'id',
    description: 'ResearchInstrument id',
  })
  @ApiOkResponse({
    description: 'ResearchInstrument updated successfully.',
    type: ResearchInstrumentResponseDto,
  })
  updateById(
    @Param('id') id: string,
    @Body() dto: UpdateResearchInstrumentDto,
  ) {
    return this.researchInstrumentsService.update(id, dto);
  }

  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({
    summary: 'Deactivate researchInstrument',
  })
  @ApiParam({
    name: 'id',
    description: 'ResearchInstrument id',
  })
  @ApiNoContentResponse({
    description: 'ResearchInstrument deleted successfully.',
  })
  removeById(
    @Param('id') id: string,
    @Req() req: Request & { user: IUserJwt },
  ) {
    return this.researchInstrumentsService.remove(id, req.user);
  }

  @ApiBearerAuth()
  @Get('slug/:slug')
  @ApiOperation({
    summary: 'Get researchInstrument by slug',
  })
  @ApiParam({
    name: 'slug',
    description: 'ResearchInstrument slug',
    example: 'livro-teste',
  })
  @ApiOkResponse({
    description: 'ResearchInstrument retrieved successfully.',
    type: ResearchInstrumentResponseDto,
  })
  findOneBySlug(@Param('slug') slug: string) {
    return this.researchInstrumentsService.findOneBySlug(slug);
  }

  @ApiBearerAuth()
  @Patch('slug/:slug')
  @ApiOperation({
    summary: 'Update researchInstrument',
  })
  @ApiParam({
    name: 'slug',
    description: 'ResearchInstrument slug',
    example: 'livro-teste',
  })
  @ApiOkResponse({
    description: 'ResearchInstrument updated successfully.',
    type: ResearchInstrumentResponseDto,
  })
  updateBySlug(
    @Param('slug') slug: string,
    @Body() dto: UpdateResearchInstrumentDto,
  ) {
    return this.researchInstrumentsService.updateBySlug(slug, dto);
  }

  @ApiBearerAuth()
  @Delete('slug/:slug')
  @ApiOperation({
    summary: 'Deactivate researchInstrument',
  })
  @ApiParam({
    name: 'slug',
    description: 'ResearchInstrument slug',
    example: 'livro-teste',
  })
  @ApiNoContentResponse({
    description: 'ResearchInstrument deleted successfully.',
  })
  removeBySlug(
    @Param('slug') slug: string,
    @Req() req: Request & { user: IUserJwt },
  ) {
    return this.researchInstrumentsService.removeBySlug(slug, req.user);
  }

  @ApiBearerAuth()
  @Patch('slug/:slug/pdf')
  @UseInterceptors(FileInterceptor('pdf'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    type: CreateResearchInstrumentWithPdfDto,
  })
  @ApiOperation({
    summary: 'Upload research instrument pdf',
  })
  @ApiParam({
    name: 'slug',
    description: 'Research instrument slug',
  })
  @ApiOkResponse({
    description: 'Research instrument pdf uploaded successfully.',
    type: UploadImageResponseDto,
  })
  uploadCover(@Param('slug') slug: string, @UploadedFile() pdf: any) {
    return this.researchInstrumentsService.uploadPdf(slug, pdf);
  }

  @ApiBearerAuth()
  @Delete('slug/:slug/pdf')
  @ApiOperation({
    summary: 'Remove research instrument pdf',
  })
  @ApiParam({
    name: 'slug',
    description: 'Research instrument slug',
  })
  @ApiNoContentResponse({
    description: 'Research instrument pdf removed successfully.',
  })
  removeImage(@Param('slug') slug: string) {
    return this.researchInstrumentsService.removePdf(slug);
  }
}
