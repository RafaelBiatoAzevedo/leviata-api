import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Schedule } from '@prisma/client';
import { ScheduleRepository } from './schedule.repository';
import { ScheduleService } from './schedule.service';

describe('ScheduleService', () => {
  const repository = {
    existsSlug: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findBySlug: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findAll: jest.fn(),
  };
  const service = new ScheduleService(
    repository as unknown as ScheduleRepository,
  );
  const found: Schedule = {
    id: 'event-id',
    slug: 'encontro',
    title: 'Encontro',
    subtitle: null,
    description: null,
    location: null,
    externalUrl: null,
    date: new Date('2026-10-15T12:00:00Z'),
    endDate: new Date('2026-10-15T14:00:00Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    deletedById: null,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    repository.findById.mockResolvedValue(found);
    repository.findBySlug.mockResolvedValue(found);
    repository.existsSlug.mockResolvedValue(false);
  });

  it('reserva slugs já utilizados e preserva o horário recebido', async () => {
    repository.existsSlug
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    await service.create({
      title: 'Encontro',
      date: '2026-10-15T09:00:00-03:00',
    });
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'encontro-3',
        date: new Date('2026-10-15T12:00:00Z'),
        endDate: null,
      }),
    );
  });

  it('rejeita um novo evento com período invertido antes de gravar', async () => {
    await expect(
      service.create({
        title: 'Encontro',
        date: '2026-10-15T12:00:00Z',
        endDate: '2026-10-14T12:00:00Z',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('valida a nova data inicial contra o fim já salvo em um PATCH parcial', async () => {
    await expect(
      service.update(found.id, { date: '2026-10-16T12:00:00Z' }),
    ).rejects.toThrow(BadRequestException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('permite limpar campos opcionais e remover o fim ao mudar a data inicial', async () => {
    await service.updateBySlug(found.slug, {
      date: '2026-10-16T12:00:00Z',
      endDate: null,
      externalUrl: null,
    });
    expect(repository.update).toHaveBeenCalledWith(
      found.id,
      expect.objectContaining({
        date: new Date('2026-10-16T12:00:00Z'),
        endDate: null,
        externalUrl: null,
        slug: found.slug,
      }),
    );
  });

  it('não altera o slug quando edita somente a descrição', async () => {
    await service.update(found.id, { description: 'Descrição atualizada' });
    expect(repository.existsSlug).not.toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalledWith(found.id, {
      description: 'Descrição atualizada',
      slug: found.slug,
    });
  });

  it('recalcula o slug ao alterar o título, ignorando o próprio evento', async () => {
    await service.updateBySlug(found.slug, { title: 'Seminário de História' });
    expect(repository.existsSlug).toHaveBeenCalledWith(
      'seminario-de-historia',
      found.id,
    );
    expect(repository.update).toHaveBeenCalledWith(found.id, {
      title: 'Seminário de História',
      slug: 'seminario-de-historia',
    });
  });

  it('não atualiza um registro ausente ou excluído', async () => {
    repository.findBySlug.mockResolvedValue(null);
    await expect(
      service.updateBySlug('excluido', { title: 'Novo título' }),
    ).rejects.toThrow(NotFoundException);
    expect(repository.update).not.toHaveBeenCalled();
  });
});
