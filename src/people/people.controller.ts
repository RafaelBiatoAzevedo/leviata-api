import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
  findOne(@Param('id') id: string) {
    return this.peopleService.findOne(id);
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
  update(@Param('id') id: string, @Body() dto: UpdatePersonDto) {
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
  remove(@Param('id') id: string) {
    return this.peopleService.remove(id);
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
}
