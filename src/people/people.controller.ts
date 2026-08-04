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
  UseGuards,
} from '@nestjs/common';

import {
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

@UseGuards(JwtAuthGuard)
@Controller('people')
@ApiTags('People')
export class PeopleController {
  constructor(private readonly peopleService: PeopleService) {}

  @Post()
  @ApiOperation({
    summary: 'Create person',
  })
  @ApiCreatedResponse({
    description: 'Person created successfully.',
    type: PersonResponseDto,
  })
  create(@Body() dto: CreatePersonDto) {
    return this.peopleService.create(dto);
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

  @Patch(':id/image')
  @ApiOperation({
    summary: 'Upload person profile image',
  })
  @ApiParam({
    name: 'id',
    description: 'Person id',
  })
  @ApiOkResponse({
    description: 'Person profile image uploaded successfully.',
    type: PersonResponseDto,
  })
  uploadImage(
    @Param('id') id: string,
    // @UploadedFile() file: Express.Multer.File,
  ) {
    return this.peopleService.uploadImage(id);
  }

  @Delete(':id/image')
  @ApiOperation({
    summary: 'Remove person profile image',
  })
  @ApiParam({
    name: 'id',
    description: 'Person id',
  })
  @ApiOkResponse({
    description: 'Person profile image removed successfully.',
    type: PersonResponseDto,
  })
  removeImage(@Param('id') id: string) {
    return this.peopleService.removeImage(id);
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
