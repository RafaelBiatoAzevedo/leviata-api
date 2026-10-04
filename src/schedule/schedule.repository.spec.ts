import { PrismaService } from '../prisma/prisma.service';
import { ScheduleRepository } from './schedule.repository';

describe('ScheduleRepository', () => {
  const schedule = {
    findFirst: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  };
  const repository = new ScheduleRepository({
    schedule,
  } as unknown as PrismaService);

  beforeEach(() => jest.resetAllMocks());

  it('não recupera registros excluídos por id ou slug', async () => {
    await repository.findById('event-id');
    await repository.findBySlug('evento');
    expect(schedule.findFirst).toHaveBeenNthCalledWith(1, {
      where: { id: 'event-id', deletedAt: null },
    });
    expect(schedule.findFirst).toHaveBeenNthCalledWith(2, {
      where: { slug: 'evento', deletedAt: null },
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
});
