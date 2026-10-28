import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateScheduleDto } from './create-schedule.dto';
import { ScheduleQueryDto } from './schedule-query.dto';
import { UpdateScheduleDto } from './update-schedule.dto';

describe('Schedule DTO validation', () => {
  it('rejeita título vazio, data impossível e protocolo de link inválido', async () => {
    const dto = plainToInstance(CreateScheduleDto, {
      title: '   ',
      date: '2026-02-30',
      externalUrl: 'javascript:alert(1)',
    });
    const errors = await validate(dto);
    expect(errors.map(({ property }) => property)).toEqual(
      expect.arrayContaining(['title', 'date', 'externalUrl']),
    );
  });

  it('aceita limpar campos opcionais com null', async () => {
    expect(
      await validate(
        plainToInstance(UpdateScheduleDto, {
          subtitle: null,
          description: null,
          endDate: null,
          externalUrl: null,
          meetingId: null,
        }),
      ),
    ).toHaveLength(0);
  });

  it('rejeita null nos campos obrigatórios em um PATCH', async () => {
    const errors = await validate(
      plainToInstance(UpdateScheduleDto, { title: null, date: null }),
    );
    expect(errors.map(({ property }) => property)).toEqual(
      expect.arrayContaining(['title', 'date']),
    );
  });

  it('valida o UUID do evento vinculado em criação e edição', async () => {
    for (const Dto of [CreateScheduleDto, UpdateScheduleDto]) {
      const invalid = await validate(
        plainToInstance(Dto, { meetingId: 'invalid' }),
      );
      expect(invalid.some(({ property }) => property === 'meetingId')).toBe(
        true,
      );
      const valid = await validate(
        plainToInstance(Dto, {
          meetingId: '550e8400-e29b-41d4-a716-446655440000',
        }),
      );
      expect(valid.some(({ property }) => property === 'meetingId')).toBe(
        false,
      );
    }
  });

  it('rejeita paginação e ordenação fora dos limites', async () => {
    const errors = await validate(
      plainToInstance(ScheduleQueryDto, {
        page: '0',
        limit: '101',
        sortBy: 'deletedAt',
        sortOrder: 'invalid',
      }),
    );
    expect(errors.map(({ property }) => property)).toEqual(
      expect.arrayContaining(['page', 'limit', 'sortBy', 'sortOrder']),
    );
  });
});
