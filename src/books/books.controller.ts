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

import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { IUserJwt } from 'src/auth/jwt.strategy';
import { BooksService } from './books.service';
import { BookResponseDto } from './dto/book-response.dto';
import { CreateBookDto } from './dto/create-book.dto';
import { BooksQueryDto } from './dto/book-query.dto';
import { UpdateBookDto } from './dto/update.book.dto';

@UseGuards(JwtAuthGuard)
@Controller('books')
@ApiTags('Books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Post()
  @ApiOperation({
    summary: 'Create book',
  })
  @ApiCreatedResponse({
    description: 'Book created successfully.',
    type: BookResponseDto,
  })
  create(@Body() dto: CreateBookDto) {
    return this.booksService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List books',
  })
  @ApiOkResponse({
    description: 'Books retrieved successfully.',
    type: BookResponseDto,
    isArray: true,
  })
  findAll(@Query() query: BooksQueryDto) {
    return this.booksService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get book by id',
  })
  @ApiParam({
    name: 'id',
    description: 'Book id',
  })
  @ApiOkResponse({
    description: 'Book retrieved successfully.',
    type: BookResponseDto,
  })
  findOneById(@Param('id') id: string) {
    return this.booksService.findOneById(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update book',
  })
  @ApiParam({
    name: 'id',
    description: 'Book id',
  })
  @ApiOkResponse({
    description: 'Book updated successfully.',
    type: BookResponseDto,
  })
  updateById(@Param('id') id: string, @Body() dto: UpdateBookDto) {
    return this.booksService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Deactivate book',
  })
  @ApiParam({
    name: 'id',
    description: 'Book id',
  })
  @ApiNoContentResponse({
    description: 'Book deleted successfully.',
  })
  removeById(
    @Param('id') id: string,
    @Req() req: Request & { user: IUserJwt },
  ) {
    return this.booksService.remove(id, req.user);
  }

  @Patch(':id/image')
  @ApiOperation({
    summary: 'Upload book profile image',
  })
  @ApiParam({
    name: 'id',
    description: 'Book id',
  })
  @ApiOkResponse({
    description: 'Book profile image uploaded successfully.',
    type: BookResponseDto,
  })
  uploadImage(
    @Param('id') id: string,
    // @UploadedFile() file: Express.Multer.File,
  ) {
    return this.booksService.uploadImage(id);
  }

  @Delete(':id/image')
  @ApiOperation({
    summary: 'Remove book profile image',
  })
  @ApiParam({
    name: 'id',
    description: 'Book id',
  })
  @ApiOkResponse({
    description: 'Book profile image removed successfully.',
    type: BookResponseDto,
  })
  removeImage(@Param('id') id: string) {
    return this.booksService.removeImage(id);
  }

  @Get('slug/:slug')
  @ApiOperation({
    summary: 'Get book by slug',
  })
  @ApiParam({
    name: 'slug',
    description: 'Book slug',
    example: 'rafael-biato-azevedo',
  })
  @ApiOkResponse({
    description: 'Book retrieved successfully.',
    type: BookResponseDto,
  })
  findOneBySlug(@Param('slug') slug: string) {
    return this.booksService.findOneBySlug(slug);
  }

  @Patch('slug/:slug')
  @ApiOperation({
    summary: 'Update book',
  })
  @ApiParam({
    name: 'slug',
    description: 'Book slug',
    example: 'rafael-biato-azevedo',
  })
  @ApiOkResponse({
    description: 'Book updated successfully.',
    type: BookResponseDto,
  })
  updateBySlug(@Param('slug') slug: string, @Body() dto: UpdateBookDto) {
    return this.booksService.updateBySlug(slug, dto);
  }

  @Delete('slug/:slug')
  @ApiOperation({
    summary: 'Deactivate book',
  })
  @ApiParam({
    name: 'slug',
    description: 'Book slug',
    example: 'rafael-biato-azevedo',
  })
  @ApiNoContentResponse({
    description: 'Book deleted successfully.',
  })
  removeBySlug(
    @Param('slug') slug: string,
    @Req() req: Request & { user: IUserJwt },
  ) {
    return this.booksService.removeBySlug(slug, req.user);
  }
}
