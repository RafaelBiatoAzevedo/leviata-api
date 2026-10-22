import { PersonCategory, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PeopleRepository } from './people.repository';

describe('People catalog pagination', () => {
  it.each(['displayOrder', 'name', 'createdAt'])(
    'uses an ID tie breaker when catalog pages are sorted by %s',
    async (sortBy) => {
      const findMany = jest
        .fn<Promise<unknown[]>, [Prisma.PersonFindManyArgs]>()
        .mockResolvedValue([]);
      const repository = new PeopleRepository({
        person: { findMany },
      } as unknown as PrismaService);

      await repository.findAll({
        page: 2,
        limit: 100,
        category: PersonCategory.PESQUISADOR,
        sortBy,
        sortOrder: 'desc',
      });

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 100,
          take: 100,
          where: { deletedAt: null, category: PersonCategory.PESQUISADOR },
          orderBy: [{ [sortBy]: 'desc' }, { id: 'asc' }],
        }),
      );
    },
  );

  it('keeps the same ordering and filters for public and admin pages', async () => {
    const records = [{ id: 'person-16' }];
    const findMany = jest
      .fn<Promise<typeof records>, [Prisma.PersonFindManyArgs]>()
      .mockResolvedValue(records);
    const count = jest.fn().mockResolvedValue(241);
    const repository = new PeopleRepository({
      person: { findMany, count },
    } as unknown as PrismaService);
    const query = { page: 2, limit: 15, search: 'Ana', isActive: 'true' };

    expect(await repository.findAll(query)).toEqual(records);
    expect(await repository.findPage(query)).toEqual({
      items: records,
      total: 241,
      page: 2,
      limit: 15,
    });
    expect(findMany.mock.calls[0][0]).toEqual(findMany.mock.calls[1][0]);
    expect(findMany.mock.calls[0][0].where).toMatchObject({
      deletedAt: null,
      isActive: true,
    });
    expect(count).toHaveBeenCalledWith({
      where: findMany.mock.calls[0][0].where,
    });
  });
});
