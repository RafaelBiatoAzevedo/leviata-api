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
      jury: { count: jest.fn().mockReturnValue(8) },
      board: { count: jest.fn().mockReturnValue(9) },
      presentedWork: { count: jest.fn().mockReturnValue(10) },
      search: { count: jest.fn().mockReturnValue(11) },
      researchInstrument: { count: jest.fn().mockReturnValue(12) },
      thematic: { count: jest.fn().mockReturnValue(13) },
      video: { count: jest.fn().mockReturnValue(14) },
      schedule: { count: jest.fn().mockReturnValue(15) },
      newsletter: { count: jest.fn().mockReturnValue(16) },
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
      juries: 8,
      boards: 9,
      presentedWorks: 10,
      research: 11,
      researchInstruments: 12,
      thematics: 13,
      videos: 14,
      schedule: 15,
      newsletters: 16,
    });
    expect(prisma.person.count).toHaveBeenCalledWith({
      where: { deletedAt: null, isActive: true },
    });
    for (const model of [
      prisma.book,
      prisma.news,
      prisma.meeting,
      prisma.jury,
      prisma.board,
      prisma.presentedWork,
      prisma.search,
      prisma.researchInstrument,
      prisma.thematic,
      prisma.video,
      prisma.schedule,
      prisma.newsletter,
    ]) {
      expect(model.count).toHaveBeenCalledWith({ where: { deletedAt: null } });
      expect(model.count).toHaveBeenCalledTimes(1);
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
