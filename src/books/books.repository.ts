import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { BooksQueryDto } from './dto/book-query.dto';

@Injectable()
export class BookRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly include = {
    authors: {
      include: {
        institution: true,
        academicTitle: true,
      },
    },
  };

  findById(id: string) {
    return this.prisma.book.findFirst({
      where: {
        id,
        deletedAt: null,
      },

      include: this.include,
    });
  }

  findBySlug(slug: string) {
    return this.prisma.book.findUnique({
      where: {
        slug,
      },

      include: this.include,
    });
  }

  async existsSlug(slug: string, ignoreId?: string): Promise<boolean> {
    const count = await this.prisma.book.count({
      where: {
        slug,
        deletedAt: null,
        ...(ignoreId && {
          NOT: {
            id: ignoreId,
          },
        }),
      },
    });

    return count > 0;
  }

  async findAll(query: BooksQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      authorId,
      publisher,
      year,
      sortBy = 'title',
      sortOrder = 'asc',
    } = query;

    return this.prisma.book.findMany({
      where: {
        deletedAt: null,

        ...(search && {
          OR: [
            {
              title: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              subtitle: {
                contains: search,
                mode: 'insensitive',
              },
            },
          ],
        }),

        ...(publisher && {
          publisher: {
            contains: publisher,
            mode: 'insensitive',
          },
        }),

        ...(year && {
          year,
        }),

        ...(authorId && {
          authors: {
            some: {
              id: authorId,
            },
          },
        }),
      },

      include: this.include,

      orderBy: {
        [sortBy]: sortOrder,
      },

      skip: (page - 1) * limit,
      take: limit,
    });
  }

  remove(id: string, bookId: string) {
    return this.prisma.book.update({
      where: {
        id,
      },

      data: {
        deletedAt: new Date(),
        deletedById: bookId,
      },
    });
  }

  update(id: string, data: Prisma.BookUpdateInput) {
    return this.prisma.book.update({
      where: {
        id,
      },

      data,

      include: this.include,
    });
  }

  create(data: Prisma.BookCreateInput) {
    return this.prisma.book.create({
      data,
      include: this.include,
    });
  }
}
