import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { MeetingType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMeetingDto } from './DTOs/create-meeting.dto';
import { MeetingsQueryDto } from './DTOs/meeting-query.dto';
import { UpdateMeetingDto } from './DTOs/update.meeting.dto';
import { MeetingsRepository } from './meetings.repository';

describe('Meeting classification validation', () => {
  it.each(Object.values(MeetingType))(
    'accepts type %s in create, edit and list filters',
    (type) => {
      for (const Dto of [
        CreateMeetingDto,
        UpdateMeetingDto,
        MeetingsQueryDto,
      ]) {
        const dto = plainToInstance(Dto as new () => object, { type });
        expect(
          validateSync(dto).filter((error) => error.property === 'type'),
        ).toEqual([]);
        expect(dto).toHaveProperty('type', type);
      }
    },
  );

  it.each([true, false, 'true', 'false'])(
    'accepts and preserves boolean input %s in JSON, multipart and query strings',
    (value) => {
      const expected = value === true || value === 'true';
      for (const Dto of [
        CreateMeetingDto,
        UpdateMeetingDto,
        MeetingsQueryDto,
      ]) {
        const dto = plainToInstance(Dto as new () => object, {
          isInternal: value,
        });
        expect(dto).toHaveProperty('isInternal', expected);
        expect(
          validateSync(dto).filter((error) => error.property === 'isInternal'),
        ).toEqual([]);
      }
    },
  );

  it.each(['invalid', '', '0', 0, 1, {}])(
    'rejects a malformed classification %s',
    (value) => {
      for (const Dto of [
        CreateMeetingDto,
        UpdateMeetingDto,
        MeetingsQueryDto,
      ]) {
        const dto = plainToInstance(Dto as new () => object, {
          isInternal: value,
        });
        expect(
          validateSync(dto).some((error) => error.property === 'isInternal'),
        ).toBe(true);
      }
    },
  );

  it('keeps the field optional for existing clients and partial updates', () => {
    for (const Dto of [CreateMeetingDto, UpdateMeetingDto, MeetingsQueryDto]) {
      const dto = plainToInstance(Dto as new () => object, {});
      expect(
        validateSync(dto).filter((error) => error.property === 'isInternal'),
      ).toEqual([]);
      expect(dto).not.toHaveProperty('isInternal', true);
    }
  });
});

describe('Meeting listing visibility', () => {
  const meeting = {
    findMany: jest.fn<Promise<unknown[]>, [Prisma.MeetingFindManyArgs]>(),
    count: jest.fn<Promise<number>, [Prisma.MeetingCountArgs]>(),
  };
  const repository = new MeetingsRepository({
    meeting,
  } as unknown as PrismaService);

  beforeEach(() => {
    jest.resetAllMocks();
    meeting.findMany.mockResolvedValue([]);
    meeting.count.mockResolvedValue(0);
  });

  it.each([true, false])(
    'applies isInternal=%s to both rows and pagination totals',
    async (isInternal) => {
      await repository.findPage({
        isInternal,
        type: 'SEMINAR',
        search: 'história',
        page: 2,
        limit: 15,
      });
      const args = meeting.findMany.mock.calls[0][0];
      expect(args.where).toMatchObject({
        isInternal,
        deletedAt: null,
        type: 'SEMINAR',
      });
      expect(args.skip).toBe(15);
      expect(args.take).toBe(15);
      expect(meeting.count).toHaveBeenCalledWith({ where: args.where });
      await repository.findAll({ isInternal });
      expect(meeting.findMany.mock.calls[1][0].where).toMatchObject({
        isInternal,
      });
    },
  );

  it('allows admin and news selectors to list both classifications when unfiltered', async () => {
    await repository.findPage({});
    const args = meeting.findMany.mock.calls[0][0];
    expect(args.where).not.toHaveProperty('isInternal');
    expect(meeting.count).toHaveBeenCalledWith({ where: args.where });
  });
});
