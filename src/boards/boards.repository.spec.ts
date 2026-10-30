import { BoardType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BoardsRepository } from './boards.repository';

describe('BoardsRepository', () => {
  const board = {
    findMany: jest.fn<Promise<never[]>, [Prisma.BoardFindManyArgs]>(),
    count: jest.fn<Promise<number>, [Prisma.BoardCountArgs]>(),
  };
  const repository = new BoardsRepository({
    board,
  } as unknown as PrismaService);

  beforeEach(() => {
    jest.resetAllMocks();
    board.findMany.mockResolvedValue([]);
    board.count.mockResolvedValue(0);
  });

  it.each(Object.values(BoardType))(
    'aplica o mesmo filtro %s aos dados e totais sem incluir excluídos',
    async (type) => {
      await repository.findAll({ type, search: 'banca' });
      await repository.findPage({ type, search: 'banca', page: 2, limit: 5 });
      for (const [args] of board.findMany.mock.calls) {
        expect(args).toMatchObject({ where: { type, deletedAt: null } });
      }
      const listWhere = board.findMany.mock.calls[1][0].where;
      expect(board.count).toHaveBeenCalledWith({ where: listWhere });
    },
  );

  it('sem filtro também mantém as bancas antigas sem classificação', async () => {
    await repository.findAll({});
    expect(board.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deletedAt: null },
      }),
    );
  });
});
