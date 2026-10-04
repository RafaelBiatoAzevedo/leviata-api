import { PrismaService } from '../prisma/prisma.service';
import { ReportsRepository } from './reports.repository';

describe('ReportsRepository', () => {
  it('exclui registros removidos e pessoas inativas e separa artigos de dossiês', async () => {
    const prisma = {
      person: { count: jest.fn().mockReturnValue(2) },
      book: { count: jest.fn().mockReturnValue(3) },
      article: {
        count: jest.fn().mockReturnValueOnce(4).mockReturnValueOnce(1),
      },
      news: { count: jest.fn().mockReturnValue(5) },
      meeting: { count: jest.fn().mockReturnValue(6) },
      $transaction: jest
        .fn()
        .mockImplementation((counts: number[]) => Promise.resolve(counts)),
    };
    const repository = new ReportsRepository(
      prisma as unknown as PrismaService,
    );

    await expect(repository.getSummaryCounts()).resolves.toEqual({
      people: 2,
      books: 3,
      articles: 4,
      dossiers: 1,
      news: 5,
      meetings: 6,
    });
    expect(prisma.person.count).toHaveBeenCalledWith({
      where: { deletedAt: null, isActive: true },
    });
    for (const model of [prisma.book, prisma.news, prisma.meeting]) {
      expect(model.count).toHaveBeenCalledWith({ where: { deletedAt: null } });
    }
    expect(prisma.article.count).toHaveBeenNthCalledWith(1, {
      where: { deletedAt: null, type: 'ARTICLE' },
    });
    expect(prisma.article.count).toHaveBeenNthCalledWith(2, {
      where: { deletedAt: null, type: 'DOSSIER' },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
