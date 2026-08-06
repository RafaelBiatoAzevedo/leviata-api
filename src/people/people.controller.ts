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
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { PeopleService } from './people.service';

import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { PeopleQueryDto } from './dto/people-query.dto';
import { PersonResponseDto } from './dto/person-response.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { IUserJwt } from 'src/auth/jwt.strategy';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImagePersonResponseDto } from './dto/image-person-response.dto';

@UseGuards(JwtAuthGuard)
@Controller('people')
@ApiTags('People')
export class PeopleController {
  constructor(private readonly peopleService: PeopleService) {}

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Create person',
  })
  @ApiCreatedResponse({
    description: 'Person created successfully.',
    type: PersonResponseDto,
  })
  create(@Body() dto: CreatePersonDto, @UploadedFile() image?: any) {
    return this.peopleService.create(dto, image);
  }

  @Get()
  @ApiOperation({
    summary: 'List people',
  })
  @ApiOkResponse({
    description: 'People retrieved successfully.',
    type: PersonResponseDto,
    isArray: true,
  })
  findAll(@Query() query: PeopleQueryDto) {
    return this.peopleService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get person by id',
  })
  @ApiParam({
    name: 'id',
    description: 'Person id',
  })
  @ApiOkResponse({
    description: 'Person retrieved successfully.',
    type: PersonResponseDto,
  })
  findOneById(@Param('id') id: string) {
    return this.peopleService.findOneById(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update person',
  })
  @ApiParam({
    name: 'id',
    description: 'Person id',
  })
  @ApiOkResponse({
    description: 'Person updated successfully.',
    type: PersonResponseDto,
  })
  updateById(@Param('id') id: string, @Body() dto: UpdatePersonDto) {
    return this.peopleService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Deactivate person',
  })
  @ApiParam({
    name: 'id',
    description: 'Person id',
  })
  @ApiNoContentResponse({
    description: 'Person deleted successfully.',
  })
  removeById(
    @Param('id') id: string,
    @Req() req: Request & { user: IUserJwt },
  ) {
    return this.peopleService.remove(id, req.user);
  }

  @Patch('slug/:slug/image')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Upload person profile image',
  })
  @ApiParam({
    name: 'slug',
    description: 'Person slug',
  })
  @ApiOkResponse({
    description: 'Person profile image uploaded successfully.',
    type: ImagePersonResponseDto,
  })
  uploadImage(@Param('slug') slug: string, @UploadedFile() file: any) {
    return this.peopleService.uploadImage(slug, file);
  }

  @Delete('slug/:slug/image')
  @ApiOperation({
    summary: 'Remove person profile image',
  })
  @ApiParam({
    name: 'slug',
    description: 'Person slug',
  })
  @ApiOkResponse({
    description: 'Person profile image removed successfully.',
    type: PersonResponseDto,
  })
  removeImage(@Param('slug') slug: string) {
    return this.peopleService.removeImage(slug);
  }

  @Get('slug/:slug')
  @ApiOperation({
    summary: 'Get person by slug',
  })
  @ApiParam({
    name: 'slug',
    description: 'Person slug',
    example: 'rafael-biato-azevedo',
  })
  @ApiOkResponse({
    description: 'Person retrieved successfully.',
    type: PersonResponseDto,
  })
  findOneBySlug(@Param('slug') slug: string) {
    return this.peopleService.findOneBySlug(slug);
  }

  @Patch('slug/:slug')
  @ApiOperation({
    summary: 'Update person',
  })
  @ApiParam({
    name: 'slug',
    description: 'Person slug',
    example: 'rafael-biato-azevedo',
  })
  @ApiOkResponse({
    description: 'Person updated successfully.',
    type: PersonResponseDto,
  })
  updateBySlug(@Param('slug') slug: string, @Body() dto: UpdatePersonDto) {
    return this.peopleService.updateBySlug(slug, dto);
  }

  @Delete('slug/:slug')
  @ApiOperation({
    summary: 'Deactivate person',
  })
  @ApiParam({
    name: 'slug',
    description: 'Person slug',
    example: 'rafael-biato-azevedo',
  })
  @ApiNoContentResponse({
    description: 'Person deleted successfully.',
  })
  removeBySlug(
    @Param('slug') slug: string,
    @Req() req: Request & { user: IUserJwt },
  ) {
    return this.peopleService.removeBySlug(slug, req.user);
  }
}
