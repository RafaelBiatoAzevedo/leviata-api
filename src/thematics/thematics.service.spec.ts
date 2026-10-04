import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ThematicsService } from './thematics.service';
import { ThematicsRepository } from './thematics.repository';

describe('Thematic video management', () => {
  const thematicId = '550e8400-e29b-41d4-a716-446655440000';
  const videoId = '550e8400-e29b-41d4-a716-446655440001';
  const personId = '550e8400-e29b-41d4-a716-446655440002';
  const linkId = '550e8400-e29b-41d4-a716-446655440003';
  const removedId = '550e8400-e29b-41d4-a716-446655440004';
  const parent = { id: thematicId, title: 'Temática', slug: 'tematica' };
  const link = {
    videoId,
    title: ' Vídeo ',
    description: ' Pesquisa ',
    personId,
  };
  const repository = {
    existsSlug: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findById: jest.fn(),
    findBySlug: jest.fn(),
    findAvailableVideos: jest.fn(),
    findAvailablePeople: jest.fn(),
    findVideoLinks: jest.fn(),
  };
  const service = new ThematicsService(
    repository as unknown as ThematicsRepository,
  );
  beforeEach(() => {
    jest.resetAllMocks();
    repository.existsSlug.mockResolvedValue(false);
    repository.findById.mockResolvedValue(parent);
    repository.findBySlug.mockResolvedValue(parent);
    repository.findAvailableVideos.mockImplementation((ids: string[]) =>
      Promise.resolve(ids.map((id) => ({ id }))),
    );
    repository.findAvailablePeople.mockImplementation((ids: string[]) =>
      Promise.resolve(ids.map((id) => ({ id }))),
    );
    repository.findVideoLinks.mockResolvedValue([
      { id: linkId },
      { id: removedId },
    ]);
  });

  it('creates a thematic without optional videos', async () => {
    await service.create({ title: 'Temática' });
    expect(repository.create).toHaveBeenCalledWith({
      title: 'Temática',
      slug: 'tematica',
      additionalVideos: { create: [] },
    });
  });
  it('creates contextual links while connecting existing catalog videos and people', async () => {
    await service.create({
      title: 'Temática',
      mainVideoId: videoId,
      coordinatorId: personId,
      additionalVideos: [link],
    });
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mainVideo: { connect: { id: videoId } },
        coordinator: { connect: { id: personId } },
        additionalVideos: {
          create: [
            {
              video: { connect: { id: videoId } },
              person: { connect: { id: personId } },
              title: 'Vídeo',
              description: 'Pesquisa',
            },
          ],
        },
      }),
    );
  });
  it('preserves existing IDs, adds new links and removes omitted links in the same nested update', async () => {
    await service.update(thematicId, {
      additionalVideos: [
        { ...link, id: linkId, personId: null, description: '' },
        { videoId, title: 'Outro enfoque' },
      ],
    });
    expect(repository.update).toHaveBeenCalledWith(thematicId, {
      slug: 'tematica',
      additionalVideos: {
        deleteMany: { id: { in: [removedId] } },
        create: [
          {
            video: { connect: { id: videoId } },
            title: 'Outro enfoque',
            description: null,
          },
        ],
        update: [
          {
            where: { id: linkId },
            data: {
              video: { connect: { id: videoId } },
              person: { disconnect: true },
              title: 'Vídeo',
              description: null,
            },
          },
        ],
      },
    });
  });
  it('preserves the list when a patch omits additionalVideos', async () => {
    await service.update(thematicId, { description: 'Novo texto' });
    expect(repository.update).toHaveBeenCalledWith(thematicId, {
      slug: 'tematica',
      description: 'Novo texto',
    });
  });
  it('clears the list with an empty array without deleting catalog videos', async () => {
    await service.updateBySlug('tematica', { additionalVideos: [] });
    expect(repository.update).toHaveBeenCalledWith(thematicId, {
      slug: 'tematica',
      additionalVideos: {
        deleteMany: { id: { in: [linkId, removedId] } },
        create: [],
        update: [],
      },
    });
  });
  it('rejects a link from a different thematic before changing anything', async () => {
    repository.findVideoLinks.mockResolvedValue([]);
    await expect(
      service.update(thematicId, {
        additionalVideos: [{ ...link, id: linkId }],
      }),
    ).rejects.toThrow(BadRequestException);
    expect(repository.findVideoLinks).toHaveBeenCalledWith(thematicId);
    expect(repository.update).not.toHaveBeenCalled();
  });
  it('rejects repeated link IDs', async () => {
    await expect(
      service.update(thematicId, {
        additionalVideos: [
          { ...link, id: linkId },
          { ...link, id: linkId },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
    expect(repository.update).not.toHaveBeenCalled();
  });
  it('rejects existing link IDs during thematic creation', async () => {
    await expect(
      service.create({
        title: 'Temática',
        additionalVideos: [{ ...link, id: linkId }],
      }),
    ).rejects.toThrow(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
  });
  it('rejects missing or deleted catalog videos', async () => {
    repository.findAvailableVideos.mockResolvedValue([]);
    await expect(
      service.create({ title: 'Temática', additionalVideos: [link] }),
    ).rejects.toThrow(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
  });
  it('rejects missing or deleted people', async () => {
    repository.findAvailablePeople.mockResolvedValue([]);
    await expect(
      service.update(thematicId, { additionalVideos: [link] }),
    ).rejects.toThrow(BadRequestException);
    expect(repository.update).not.toHaveBeenCalled();
  });
  it('clears optional coordinator/main video references explicitly', async () => {
    await service.update(thematicId, {
      mainVideoId: null,
      coordinatorId: null,
    });
    expect(repository.update).toHaveBeenCalledWith(thematicId, {
      slug: 'tematica',
      mainVideo: { disconnect: true },
      coordinator: { disconnect: true },
    });
  });
  it('does not edit a thematic that is missing or deleted', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(
      service.update(thematicId, { additionalVideos: [] }),
    ).rejects.toThrow(NotFoundException);
    expect(repository.update).not.toHaveBeenCalled();
  });
});
