import { Board, BoardType } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';
import { BoardsService } from './boards.service';
import { BoardsRepository } from './boards.repository';

describe('BoardsService', () => {
  const repository = {
    existsSlug: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findBySlug: jest.fn(),
    update: jest.fn(),
  };
  const service = new BoardsService(repository as unknown as BoardsRepository);
  const board = {
    id: 'board',
    slug: 'banca-cadastrada',
    title: 'Banca cadastrada',
    type: null,
    date: new Date('2026-10-30T17:35:00Z'),
  } as Board;

  beforeEach(() => {
    jest.resetAllMocks();
    repository.findById.mockResolvedValue(board);
    repository.findBySlug.mockResolvedValue(board);
  });

  it.each(Object.values(BoardType))(
    'salva %s com os participantes e a hora escolhidos',
    async (type) => {
      const dto = {
        title: 'Banca cadastrada',
        type,
        candidateId: 'candidate',
        advisorId: 'advisor',
        members: ['member'],
        date: board.date,
        meetingUrl: 'https://example.org/banca',
      };
      await service.create(dto);
      expect(repository.create).toHaveBeenCalledWith({
        ...dto,
        slug: 'banca-cadastrada',
        members: { connect: [{ id: 'member' }] },
      });
    },
  );

  it('classifica uma banca antiga sem alterar data, participantes ou slug', async () => {
    await service.update(board.id, { type: BoardType.QUALIFICATION });
    expect(repository.update).toHaveBeenCalledWith(board.id, {
      type: BoardType.QUALIFICATION,
      slug: board.slug,
    });
  });

  it('atualizar pelo slug não inventa classificação quando o tipo é omitido', async () => {
    await service.updateBySlug(board.slug, {
      meetingUrl: 'https://example.org/novo',
    });
    expect(repository.update).toHaveBeenCalledWith(board.id, {
      meetingUrl: 'https://example.org/novo',
      slug: board.slug,
    });
  });

  it('não atualiza bancas inexistentes', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(
      service.update('missing', { type: BoardType.DEFENSE }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.update).not.toHaveBeenCalled();
  });
});
