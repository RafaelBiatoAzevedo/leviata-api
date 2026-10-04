import { PrismaService } from '../prisma/prisma.service';
import { ThematicsRepository } from './thematics.repository';

describe('Thematic video reads', () => {
  const prisma = {
    thematic: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    thematicVideo: { findMany: jest.fn() },
    video: { findMany: jest.fn() },
    person: { findMany: jest.fn() },
  };
  const repository = new ThematicsRepository(
    prisma as unknown as PrismaService,
  );
  beforeEach(() => jest.clearAllMocks());

  it('excludes deleted thematics in both detail routes', async () => {
    await repository.findById('parent');
    await repository.findBySlug('tematica');
    expect(prisma.thematic.findFirst).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ where: { id: 'parent', deletedAt: null } }),
    );
    expect(prisma.thematic.findFirst).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ where: { slug: 'tematica', deletedAt: null } }),
    );
  });
  it('includes people and videos, hides deleted references and keeps deterministic video ordering', async () => {
    await repository.findById('parent');
    expect(prisma.thematic.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          mainVideo: { where: { deletedAt: null } },
          additionalVideos: {
            where: { video: { deletedAt: null } },
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
            include: {
              video: true,
              person: {
                where: { deletedAt: null },
                include: { institution: true, academicTitle: true },
              },
            },
          },
        }) as unknown,
      }),
    );
  });
  it('checks ownership of links rather than linking records from another thematic', async () => {
    await repository.findVideoLinks('parent');
    expect(prisma.thematicVideo.findMany).toHaveBeenCalledWith({
      where: { thematicId: 'parent' },
      select: { id: true },
    });
  });
  it('only considers active catalog records valid references', async () => {
    await repository.findAvailableVideos(['video']);
    await repository.findAvailablePeople(['person']);
    expect(prisma.video.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['video'] }, deletedAt: null },
      select: { id: true },
    });
    expect(prisma.person.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['person'] }, deletedAt: null },
      select: { id: true },
    });
  });
});
