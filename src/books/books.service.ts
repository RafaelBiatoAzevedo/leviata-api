import { Injectable, NotFoundException } from '@nestjs/common';

import { IUserJwt } from 'src/auth/jwt.strategy';
import { generateSlug } from 'src/common/utils/slug.util';
import { BooksRepository } from './books.repository';
import { CreateBookDto } from './DTOs/create-book.dto';
import { BooksQueryDto } from './DTOs/book-query.dto';
import { UpdateBookDto } from './DTOs/update.book.dto';
import { CloudinaryUploadOptions } from 'src/cloudinary/interfaces/CloudnaryOptions';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { Book } from '@prisma/client';

@Injectable()
export class BooksService {
  constructor(
    private readonly booksRepository: BooksRepository,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private folderCloudinaryName = 'leviata/images/books/';

  private async changeCover(slug: string, file: any) {
    const cloudinaryOptions: CloudinaryUploadOptions = {
      folder: `${this.folderCloudinaryName}`,
      resourceType: 'image',
      publicId: slug,
      displayName: slug,
    };

    return this.cloudinaryService.upload(file, cloudinaryOptions);
  }

  private async prepareBookUpdate(bookFound: Book, dto: UpdateBookDto) {
    let slug = bookFound.slug;
    let coverUrl = bookFound.coverUrl;
    let coverPublicId = bookFound.coverPublicId;

    if (dto.title && dto.title !== bookFound.title) {
      const baseSlug = generateSlug(dto.title);

      let newSlug = baseSlug;
      let counter = 2;

      while (await this.booksRepository.existsSlug(newSlug, bookFound.id)) {
        newSlug = `${baseSlug}-${counter++}`;
      }

      slug = newSlug;

      if (coverPublicId) {
        const newPublicId = `${this.folderCloudinaryName}${newSlug}`;

        const result = await this.cloudinaryService.rename(
          coverPublicId,
          newPublicId,
        );

        if (result) {
          await this.cloudinaryService.updateDisplayName(
            result.public_id,
            newSlug,
          );

          coverPublicId = result.public_id;
          coverUrl = result.url;
        }
      }
    }

    return {
      ...dto,
      slug,
      coverUrl,
      coverPublicId,
      ...(dto.authors! && {
        authors: {
          set: dto.authors.map((id) => ({ id })),
        },
      }),
    };
  }

  async create(dto: CreateBookDto, cover?: any) {
    let coverUrl: string | undefined;
    let coverPublicId: string | undefined;
    let slug = generateSlug(dto.title);
    let counter = 2;

    while (await this.booksRepository.existsSlug(slug)) {
      slug = `${generateSlug(dto.title)}-${counter++}`;
    }

    if (cover) {
      const result = await this.changeCover(slug, cover);

      coverUrl = result.url;
      coverPublicId = result.public_id;
    }

    const bookInput = {
      ...dto,
      slug,
      coverUrl,
      coverPublicId,
      ...(dto.authors && {
        authors: {
          connect: dto.authors.map((id) => ({ id })),
        },
      }),
    };

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

    const bookUpdate = await this.prepareBookUpdate(bookFound, dto);

    return this.booksRepository.update(id, bookUpdate);
  }

  async updateBySlug(slug: string, dto: UpdateBookDto) {
    const bookFound = await this.findOneBySlug(slug);

    const bookUpdate = await this.prepareBookUpdate(bookFound, dto);

    return this.booksRepository.update(bookFound.id, bookUpdate);
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

  async removeBySlug(slug: string, user: IUserJwt) {
    const book = await this.findOneBySlug(slug);

    await this.booksRepository.remove(book.id, user.id);

    return;
  }

  async uploadCover(slug: string, file: any) {
    const book = await this.booksRepository.findBySlug(slug);

    if (!book) {
      throw new NotFoundException('Book not found.');
    }

    const result = await this.changeCover(slug, file);

    await this.booksRepository.update(book.id, {
      coverUrl: result.url,
      coverPublicId: result.public_id,
    });

    return {
      url: result.url,
      public_id: result.public_id,
    };
  }

  async removeCover(slug: string) {
    const book = await this.booksRepository.findBySlug(slug);

    if (!book) {
      throw new NotFoundException('Book not found.');
    }

    await this.cloudinaryService.deleteFile(
      `${this.folderCloudinaryName}${slug}`,
    );

    await this.booksRepository.update(book.id, {
      coverUrl: null,
      coverPublicId: null,
    });
  }
}
