import { NotFoundException } from '@nestjs/common';
import { Meeting, MeetingType, Prisma } from '@prisma/client';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { MeetingsRepository } from './meetings.repository';
import { MeetingsService } from './meetings.service';

describe('Meeting visibility', () => {
  const existing = {
    id: 'meeting-id',
    slug: 'evento',
    title: 'Evento',
    isInternal: true,
    coverUrl: null,
    coverPublicId: null,
  } as Meeting;
  const repository = {
    existsSlug: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findBySlug: jest.fn(),
    update: jest.fn<Promise<Meeting>, [string, Prisma.MeetingUpdateInput]>(),
  };
  const service = new MeetingsService(
    repository as unknown as MeetingsRepository,
    {} as CloudinaryService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    repository.existsSlug.mockResolvedValue(false);
    repository.findById.mockResolvedValue(existing);
    repository.findBySlug.mockResolvedValue(existing);
  });

  it.each([true, false])(
    'persists isInternal=%s when creating any event type',
    async (isInternal) => {
      for (const type of Object.values(MeetingType)) {
        repository.create.mockResolvedValue({ ...existing, type, isInternal });
        const result = await service.create({
          title: 'Evento',
          type,
          date: new Date('2026-10-23'),
          isInternal,
          speakers: ['speaker-id'],
        });
        expect(repository.create).toHaveBeenLastCalledWith(
          expect.objectContaining({
            type,
            isInternal,
            speakers: { connect: [{ id: 'speaker-id' }] },
          }),
        );
        expect(result.isInternal).toBe(isInternal);
      }
    },
  );

  it.each([true, false])(
    'supports changing classification to %s by ID and slug',
    async (isInternal) => {
      for (const update of [
        () => service.update(existing.id, { isInternal }),
        () => service.updateBySlug(existing.slug, { isInternal }),
      ]) {
        await update();
        expect(repository.update).toHaveBeenLastCalledWith(
          existing.id,
          expect.objectContaining({ isInternal }),
        );
      }
    },
  );

  it('leaves classification untouched on an unrelated partial edit', async () => {
    await service.update(existing.id, { location: 'Auditório' });
    const data = repository.update.mock.calls[0][1];
    expect(data).not.toHaveProperty('isInternal');
  });

  it('keeps external details available by ID and slug for linked news', async () => {
    const external = { ...existing, isInternal: false };
    repository.findById.mockResolvedValue(external);
    repository.findBySlug.mockResolvedValue(external);
    expect(await service.findOneById(existing.id)).toBe(external);
    expect(await service.findOneBySlug(existing.slug)).toBe(external);
    repository.findById.mockResolvedValue(null);
    await expect(service.findOneById('missing')).rejects.toThrow(
      NotFoundException,
    );
  });
});
