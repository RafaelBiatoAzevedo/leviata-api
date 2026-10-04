import { Injectable } from '@nestjs/common';
import { ArticleType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getSummaryCounts() {
    const [people, books, articles, dossiers, news, meetings] =
      await this.prisma.$transaction([
        this.prisma.person.count({
          where: { deletedAt: null, isActive: true },
        }),
        this.prisma.book.count({ where: { deletedAt: null } }),
        this.prisma.article.count({
          where: { deletedAt: null, type: ArticleType.ARTICLE },
        }),
        this.prisma.article.count({
          where: { deletedAt: null, type: ArticleType.DOSSIER },
        }),
        this.prisma.news.count({ where: { deletedAt: null } }),
        this.prisma.meeting.count({ where: { deletedAt: null } }),
      ]);

    return { people, books, articles, dossiers, news, meetings };
  }
}
