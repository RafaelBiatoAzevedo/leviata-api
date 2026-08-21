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
import { FileInterceptor } from '@nestjs/platform-express';
import { Public } from 'src/common/decorators/public.decorator';
import { MeetingsService } from './meetings.service';
import { MeetingResponseDto } from './DTOs/meeting-response.dto';
import { CreateMeetingDto } from './DTOs/create-meeting.dto';
import { UpdateMeetingDto } from './DTOs/update.meeting.dto';
import { MeetingsQueryDto } from './DTOs/meeting-query.dto';
import { CreateMeetingWithImageDto } from './DTOs/create-book-with-cover.dto';

@UseGuards(JwtAuthGuard)
@Controller('meetings')
@ApiTags('Meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @ApiBearerAuth()
  @Post()
  @UseInterceptors(FileInterceptor('cover'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    type: CreateMeetingWithImageDto,
  })
  @ApiOperation({
    summary: 'Create meeting',
  })
  @ApiCreatedResponse({
    description: 'Meeting created successfully.',
    type: MeetingResponseDto,
  })
  create(@Body() dto: CreateMeetingDto, @UploadedFile() cover?: any) {
    return this.meetingsService.create(dto, cover);
  }

  @Public()
  @Get()
  @ApiOperation({
    summary: 'List meetings',
  })
  @ApiOkResponse({
    description: 'Meetings retrieved successfully.',
    type: MeetingResponseDto,
    isArray: true,
  })
  findAll(@Query() query: MeetingsQueryDto) {
    return this.meetingsService.findAll(query);
  }

  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({
    summary: 'Get meeting by id',
  })
  @ApiParam({
    name: 'id',
    description: 'Meeting id',
  })
  @ApiOkResponse({
    description: 'Meeting retrieved successfully.',
    type: MeetingResponseDto,
  })
  findOneById(@Param('id') id: string) {
    return this.meetingsService.findOneById(id);
  }

  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({
    summary: 'Update meeting',
  })
  @ApiParam({
    name: 'id',
    description: 'Meeting id',
  })
  @ApiOkResponse({
    description: 'Meeting updated successfully.',
    type: MeetingResponseDto,
  })
  updateById(@Param('id') id: string, @Body() dto: UpdateMeetingDto) {
    return this.meetingsService.update(id, dto);
  }

  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({
    summary: 'Deactivate meeting',
  })
  @ApiParam({
    name: 'id',
    description: 'Meeting id',
  })
  @ApiNoContentResponse({
    description: 'Meeting deleted successfully.',
  })
  removeById(
    @Param('id') id: string,
    @Req() req: Request & { user: IUserJwt },
  ) {
    return this.meetingsService.remove(id, req.user);
  }

  @ApiBearerAuth()
  @Patch('slug/:slug/cover')
  @UseInterceptors(FileInterceptor('cover'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    type: CreateMeetingWithImageDto,
  })
  @ApiOperation({
    summary: 'Upload meeting cover',
  })
  @ApiParam({
    name: 'slug',
    description: 'Meeting slug',
  })
  @ApiOkResponse({
    description: 'Meeting cover uploaded successfully.',
    type: MeetingResponseDto,
  })
  uploadCover(@Param('slug') slug: string, @UploadedFile() cover: any) {
    return this.meetingsService.uploadCover(slug, cover);
  }

  @ApiBearerAuth()
  @Delete('slug/:slug/cover')
  @ApiOperation({
    summary: 'Remove meeting cover',
  })
  @ApiParam({
    name: 'slug',
    description: 'Meeting slug',
  })
  @ApiNoContentResponse({
    description: 'Meeting cover removed successfully.',
  })
  removeImage(@Param('slug') slug: string) {
    return this.meetingsService.removeCover(slug);
  }

  @ApiBearerAuth()
  @Get('slug/:slug')
  @ApiOperation({
    summary: 'Get meeting by slug',
  })
  @ApiParam({
    name: 'slug',
    description: 'Meeting slug',
    example: 'livro-teste',
  })
  @ApiOkResponse({
    description: 'Meeting retrieved successfully.',
    type: MeetingResponseDto,
  })
  findOneBySlug(@Param('slug') slug: string) {
    return this.meetingsService.findOneBySlug(slug);
  }

  @ApiBearerAuth()
  @Patch('slug/:slug')
  @ApiOperation({
    summary: 'Update meeting',
  })
  @ApiParam({
    name: 'slug',
    description: 'Meeting slug',
    example: 'livro-teste',
  })
  @ApiOkResponse({
    description: 'Meeting updated successfully.',
    type: MeetingResponseDto,
  })
  updateBySlug(@Param('slug') slug: string, @Body() dto: UpdateMeetingDto) {
    return this.meetingsService.updateBySlug(slug, dto);
  }

  @ApiBearerAuth()
  @Delete('slug/:slug')
  @ApiOperation({
    summary: 'Deactivate meeting',
  })
  @ApiParam({
    name: 'slug',
    description: 'Meeting slug',
    example: 'livro-teste',
  })
  @ApiNoContentResponse({
    description: 'Meeting deleted successfully.',
  })
  removeBySlug(
    @Param('slug') slug: string,
    @Req() req: Request & { user: IUserJwt },
  ) {
    return this.meetingsService.removeBySlug(slug, req.user);
  }
}
