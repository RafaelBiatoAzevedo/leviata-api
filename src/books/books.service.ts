import { Injectable, NotFoundException } from '@nestjs/common';

import { IUserJwt } from 'src/auth/jwt.strategy';
import { generateSlug } from 'src/common/utils/slug.util';
import { BookRepository } from './books.repository';
import { CreateBookDto } from './dto/create-book.dto';
import { BooksQueryDto } from './dto/book-query.dto';
import { UpdateBookDto } from './dto/update.book.dto';

@Injectable()
export class BooksService {
  constructor(private readonly booksRepository: BookRepository) {}

  async create(dto: CreateBookDto) {
    let slug = generateSlug(dto.title);

    let counter = 2;

    while (await this.booksRepository.existsSlug(slug)) {
      slug = `${generateSlug(dto.title)}-${counter++}`;
    }

    const bookInput = { ...dto, slug };

    const book = await this.booksRepository.create(bookInput);

    return book;
  }

  async findAll(query: BooksQueryDto) {
    const books = await this.booksRepository.findAll(query);

    return books;
  }

  async findOneById(id: string) {
    const book = await this.booksRepository.findById(id);

    if (!book) {
      throw new NotFoundException('book not found.');
    }

    return book;
  }

  async update(id: string, dto: UpdateBookDto) {
    const bookFound = await this.findOneById(id);

    let slug = bookFound.slug;

    if (dto.title && dto.title !== bookFound.title) {
      const baseSlug = generateSlug(dto.title);

      let newSlug = baseSlug;
      let counter = 2;

      while (await this.booksRepository.existsSlug(slug, id)) {
        newSlug = `${baseSlug}-${counter++}`;
      }

      slug = newSlug;
    }

    const bookUpdate = { ...dto, slug };
    const book = await this.booksRepository.update(id, bookUpdate);

    return book;
  }

  async remove(id: string, user: IUserJwt) {
    await this.findOneById(id);

    await this.booksRepository.remove(id, user.id);

    return;
  }

  async findOneBySlug(slug: string) {
    const book = await this.booksRepository.findBySlug(slug);

    if (!book) {
      throw new NotFoundException('book not found.');
    }

    return book;
  }

  async updateBySlug(slug: string, dto: UpdateBookDto) {
    const bookFound = await this.findOneBySlug(slug);

    let tempSlug = bookFound.slug;

    if (dto.title && dto.title !== bookFound.title) {
      const baseSlug = generateSlug(dto.title);

      let newSlug = baseSlug;
      let counter = 2;

      while (await this.booksRepository.existsSlug(newSlug, bookFound.id)) {
        newSlug = `${baseSlug}-${counter++}`;
      }

      tempSlug = newSlug;
    }

    const bookUpdate = { ...dto, slug: tempSlug };
    const book = await this.booksRepository.update(bookFound.id, bookUpdate);

    return book;
  }

  async removeBySlug(slug: string, user: IUserJwt) {
    const book = await this.findOneBySlug(slug);

    await this.booksRepository.remove(book.id, user.id);

    return;
  }

  async uploadImage(id: string) {
    throw new Error('Not implemented yet.');
  }

  async removeImage(id: string) {
    throw new Error('Not implemented yet.');
  }
}
