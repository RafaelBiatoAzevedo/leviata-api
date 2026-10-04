import { PrismaService } from '../../prisma/prisma.service';
import { ArticleType, NewsCategory, PersonCategory } from '@prisma/client';
import { ArticlesQueryDto } from '../../articles/DTOs/article-query.dto';
import { PeopleQueryDto } from '../../people/DTOs/people-query.dto';
import { NewsQueryDto } from '../../news/DTOs/news-query.dto';
import { BooksRepository } from '../../books/books.repository';
import { ArticlesRepository } from '../../articles/articles.repository';
import { PeopleRepository } from '../../people/people.repository';
import { NewsRepository } from '../../news/news.repository';
import { BoardsRepository } from '../../boards/boards.repository';
import { JuriesRepository } from '../../juris/juries.repository';
import { MeetingsRepository } from '../../meetings/meetings.repository';
import { PresentedWorksRepository } from '../../presentedWorks/presented-works.repository';
import { ResearchRepository } from '../../research/researchs.repository';
import { ResearchInstrumentsRepository } from '../../researchInstruments/researchInstruments.repository';
import { ThematicsRepository } from '../../thematics/thematics.repository';
import { VideosRepository } from '../../videos/videos.repository';
import { NewsletterRepository } from '../../newsletter/newsletter.repository';
import { ScheduleRepository } from '../../schedule/schedule.repository';

const query = {
  page: 2,
  limit: 15,
  search: 'acervo',
  sortBy: 'title' as const,
  sortOrder: 'asc' as const,
};
const modules = [
  {
    name: 'book',
    fetch: (prisma: PrismaService) =>
      new BooksRepository(prisma).findPage(query),
  },
  {
    name: 'article',
    fetch: (prisma: PrismaService) =>
      new ArticlesRepository(prisma).findPage(query),
  },
  {
    name: 'person',
    fetch: (prisma: PrismaService) =>
      new PeopleRepository(prisma).findPage(query),
  },
  {
    name: 'news',
    fetch: (prisma: PrismaService) =>
      new NewsRepository(prisma).findPage(query),
  },
  {
    name: 'board',
    fetch: (prisma: PrismaService) =>
      new BoardsRepository(prisma).findPage(query),
  },
  {
    name: 'jury',
    fetch: (prisma: PrismaService) =>
      new JuriesRepository(prisma).findPage(query),
  },
  {
    name: 'meeting',
    fetch: (prisma: PrismaService) =>
      new MeetingsRepository(prisma).findPage(query),
  },
  {
    name: 'presentedWork',
    fetch: (prisma: PrismaService) =>
      new PresentedWorksRepository(prisma).findPage(query),
  },
  {
    name: 'search',
    fetch: (prisma: PrismaService) =>
      new ResearchRepository(prisma).findPage(query),
  },
  {
    name: 'researchInstrument',
    fetch: (prisma: PrismaService) =>
      new ResearchInstrumentsRepository(prisma).findPage(query),
  },
  {
    name: 'thematic',
    fetch: (prisma: PrismaService) =>
      new ThematicsRepository(prisma).findPage(query),
  },
  {
    name: 'video',
    fetch: (prisma: PrismaService) =>
      new VideosRepository(prisma).findPage(query),
  },
  {
    name: 'newsletter',
    fetch: (prisma: PrismaService) =>
      new NewsletterRepository(prisma).findPage(query),
  },
  {
    name: 'schedule',
    fetch: (prisma: PrismaService) =>
      new ScheduleRepository(prisma).findPage(query),
  },
];

interface ListArgs {
  where: { deletedAt: null; OR: unknown[] };
  skip: number;
  take: number;
  orderBy: unknown[];
}

describe.each(modules)('Paginated $name list', ({ name, fetch }) => {
  it('returns a page and the full filtered total with consistent ordering', async () => {
    const records = [{ id: 'record-16' }];
    const delegate = {
      findMany: jest
        .fn<Promise<{ id: string }[]>, [ListArgs]>()
        .mockResolvedValue(records),
      count: jest.fn().mockResolvedValue(241),
    };
    const prisma = { [name]: delegate } as unknown as PrismaService;
    const result = await fetch(prisma);
    expect(result).toEqual({ items: records, total: 241, page: 2, limit: 15 });
    const args = delegate.findMany.mock.calls[0][0];
    expect(args.skip).toBe(15);
    expect(args.take).toBe(15);
    expect(args.where.deletedAt).toBeNull();
    expect(args.where.OR.length).toBeGreaterThan(0);
    expect(delegate.count).toHaveBeenCalledWith({ where: args.where });
    expect(args.orderBy.at(-1)).toEqual({ id: 'asc' });
  });

  it('returns an empty page and zero total when no filters match', async () => {
    const delegate = {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    };
    const prisma = { [name]: delegate } as unknown as PrismaService;
    expect(await fetch(prisma)).toEqual({
      items: [],
      total: 0,
      page: 2,
      limit: 15,
    });
  });
});

describe('Pagination filters', () => {
  it.each([
    {
      name: 'article',
      field: 'type',
      value: ArticleType.DOSSIER,
      fetch: (prisma: PrismaService) =>
        new ArticlesRepository(prisma).findPage(
          Object.assign(new ArticlesQueryDto(), query, {
            type: ArticleType.DOSSIER,
          }),
        ),
    },
    {
      name: 'person',
      field: 'category',
      value: PersonCategory.PESQUISADOR,
      fetch: (prisma: PrismaService) =>
        new PeopleRepository(prisma).findPage(
          Object.assign(new PeopleQueryDto(), query, {
            category: PersonCategory.PESQUISADOR,
          }),
        ),
    },
    {
      name: 'news',
      field: 'category',
      value: NewsCategory.EVENT,
      fetch: (prisma: PrismaService) =>
        new NewsRepository(prisma).findPage(
          Object.assign(new NewsQueryDto(), query, {
            category: NewsCategory.EVENT,
          }),
        ),
    },
  ])(
    'counts only the selected $field in $name',
    async ({ name, field, value, fetch }) => {
      const delegate = {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest
          .fn<Promise<number>, [{ where: Record<string, unknown> }]>()
          .mockResolvedValue(0),
      };
      await fetch({ [name]: delegate } as unknown as PrismaService);
      expect(delegate.count.mock.calls[0][0].where[field]).toBe(value);
    },
  );
});
