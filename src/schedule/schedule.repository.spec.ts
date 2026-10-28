import { PrismaService } from '../prisma/prisma.service';
import { ScheduleRepository } from './schedule.repository';

describe('ScheduleRepository', () => {
  const include = {
    meeting: {
      where: { deletedAt: null },
      select: {
        id: true,
        slug: true,
        title: true,
        type: true,
        isInternal: true,
      },
    },
  };
  const schedule = {
    findFirst: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  };
  const meeting = { findFirst: jest.fn() };
  const repository = new ScheduleRepository({
    schedule,
    meeting,
  } as unknown as PrismaService);

  beforeEach(() => jest.resetAllMocks());

  it('não recupera registros excluídos por id ou slug', async () => {
    await repository.findById('event-id');
    await repository.findBySlug('evento');
    expect(schedule.findFirst).toHaveBeenNthCalledWith(1, {
      where: { id: 'event-id', deletedAt: null },
      include,
    });
    expect(schedule.findFirst).toHaveBeenNthCalledWith(2, {
      where: { slug: 'evento', deletedAt: null },
      include,
    });
  });

  it('considera registros excluídos ao reservar um slug único', async () => {
    schedule.count.mockResolvedValue(1);
    expect(await repository.existsSlug('evento')).toBe(true);
    expect(schedule.count).toHaveBeenCalledWith({ where: { slug: 'evento' } });
  });

  it('registra quem excluiu o evento sem apagar o registro', async () => {
    await repository.remove('event-id', 'user-id');
    expect(schedule.update).toHaveBeenCalledWith({
      where: { id: 'event-id' },
      data: { deletedAt: expect.any(Date) as Date, deletedById: 'user-id' },
    });
  });

  it('permite selecionar eventos externos, mas nunca excluídos', async () => {
    await repository.findAvailableMeeting('meeting-id');
    expect(meeting.findFirst).toHaveBeenCalledWith({
      where: { id: 'meeting-id', deletedAt: null },
      select: { id: true },
    });
  });

  it('inclui o destino público também nas listas e na paginação, omitindo eventos excluídos', async () => {
    schedule.findMany.mockResolvedValue([]);
    schedule.count.mockResolvedValue(0);
    await repository.findAll({});
    await repository.findPage({});
    for (const [args] of schedule.findMany.mock.calls) {
      expect(args).toMatchObject({
        include: {
          meeting: {
            where: { deletedAt: null },
            select: {
              id: true,
              slug: true,
              title: true,
              type: true,
              isInternal: true,
            },
          },
        },
      });
    }
  });
});
