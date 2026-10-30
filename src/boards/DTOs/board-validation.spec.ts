import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BoardType } from '@prisma/client';
import { CreateBoardDto } from './create-board.dto';
import { UpdateBoardDto } from './update-board.dto';
import { BoardsQueryDto } from './board-query.dto';

const payload = {
  title: 'Banca cadastrada',
  candidateId: '550e8400-e29b-41d4-a716-446655440000',
  advisorId: '550e8400-e29b-41d4-a716-446655440001',
  members: ['550e8400-e29b-41d4-a716-446655440002'],
  date: '2026-10-30T14:35:00-03:00',
  meetingUrl: 'https://example.org/banca',
};

describe('Board validation', () => {
  it.each(Object.values(BoardType))(
    'aceita %s e preserva a data com hora',
    async (type) => {
      const dto = plainToInstance(CreateBoardDto, { ...payload, type });
      expect(await validate(dto)).toEqual([]);
      expect(dto.date.toISOString()).toBe('2026-10-30T17:35:00.000Z');
    },
  );

  it.each([undefined, null, '', 'TCC', 'qualification'])(
    'rejeita tipo inválido na criação: %s',
    async (type) => {
      const errors = await validate(
        plainToInstance(CreateBoardDto, { ...payload, type }),
      );
      expect(errors.some((error) => error.property === 'type')).toBe(true);
    },
  );

  it('permite atualizar outros campos sem alterar a classificação existente', async () => {
    const dto = plainToInstance(UpdateBoardDto, { title: 'Título atualizado' });
    expect(await validate(dto)).toEqual([]);
    expect(dto.type).toBeUndefined();
  });

  it.each([null, '', 'TCC'])(
    'não permite apagar ou invalidar o tipo em PATCH: %s',
    async (type) => {
      const errors = await validate(plainToInstance(UpdateBoardDto, { type }));
      expect(errors.some((error) => error.property === 'type')).toBe(true);
    },
  );

  it.each(Object.values(BoardType))(
    'valida a classificação e o filtro %s',
    async (type) => {
      expect(await validate(plainToInstance(UpdateBoardDto, { type }))).toEqual(
        [],
      );
      expect(await validate(plainToInstance(BoardsQueryDto, { type }))).toEqual(
        [],
      );
    },
  );

  it('rejeita filtros desconhecidos', async () => {
    const errors = await validate(
      plainToInstance(BoardsQueryDto, { type: 'OTHER' }),
    );
    expect(errors.some((error) => error.property === 'type')).toBe(true);
  });
});
