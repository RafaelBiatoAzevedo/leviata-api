import { NotFoundException } from '@nestjs/common';
import { ImagesService, type ImageOwner } from './images.service';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import type { GalleryFile } from './gallery-file';

describe('Cloudinary galleries', () => {
  const ownerId = '550e8400-e29b-41d4-a716-446655440000';
  const imageId = '550e8400-e29b-41d4-a716-446655440001';
  const file = {
    originalname: 'photo.png',
    buffer: Buffer.from('image'),
  } as GalleryFile;
  const upload = {
    secure_url: 'https://res.cloudinary.com/test/image/upload/v1/photo.png',
    public_id: 'photo',
  };
  const baseImage = {
    id: imageId,
    imageUrl: upload.secure_url,
    publicId: upload.public_id,
    title: null,
    description: null,
    boardId: null,
    juryId: null,
    meetingId: null,
    presentedWorkId: null,
    createdAt: new Date(),
    _count: { photos: 0, supports: 0 },
  };
  let prisma: {
    board: { findFirst: jest.Mock };
    jury: { findFirst: jest.Mock };
    meeting: { findFirst: jest.Mock };
    presentedWork: { findFirst: jest.Mock };
    search: { findFirst: jest.Mock };
    image: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let cloudinary: { upload: jest.Mock; deleteFile: jest.Mock };
  let service: ImagesService;

  beforeEach(() => {
    prisma = {
      board: { findFirst: jest.fn().mockResolvedValue({ id: ownerId }) },
      jury: { findFirst: jest.fn().mockResolvedValue({ id: ownerId }) },
      meeting: { findFirst: jest.fn().mockResolvedValue({ id: ownerId }) },
      presentedWork: {
        findFirst: jest.fn().mockResolvedValue({ id: ownerId }),
      },
      search: { findFirst: jest.fn().mockResolvedValue({ id: ownerId }) },
      image: {
        create: jest.fn().mockResolvedValue(baseImage),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    cloudinary = {
      upload: jest.fn().mockResolvedValue(upload),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    };
    service = new ImagesService(
      prisma as unknown as PrismaService,
      cloudinary as unknown as CloudinaryService,
    );
  });

  it.each<ImageOwner>(['board', 'jury', 'meeting', 'presentedWork', 'search'])(
    'uploads and associates images with %s',
    async (owner) => {
      await service.upload(owner, ownerId, file, {
        title: '  Evento  ',
        description: '  Legenda  ',
      });
      expect(prisma[owner].findFirst).toHaveBeenCalledWith({
        where: { id: ownerId, deletedAt: null },
        select: { id: true },
      });
      const uploadOptions = (
        cloudinary.upload.mock.calls[0] as unknown[]
      )[1] as Record<string, unknown>;
      expect(uploadOptions.resourceType).toBe('image');
      expect(typeof uploadOptions.publicId).toBe('string');
      const call = (prisma.image.create.mock.calls[0] as unknown[])[0] as {
        data: Record<string, unknown>;
      };
      expect(call.data).toMatchObject({
        imageUrl: upload.secure_url,
        publicId: upload.public_id,
        title: 'Evento',
        description: 'Legenda',
        ...(owner === 'search'
          ? { photos: { connect: { id: ownerId } } }
          : { [`${owner}Id`]: ownerId }),
      });
    },
  );

  it('creates supporter images separately from research photos without captions', async () => {
    await service.upload('search', ownerId, file, {}, 'supports');
    const call = (prisma.image.create.mock.calls[0] as unknown[])[0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.supports).toEqual({ connect: { id: ownerId } });
    expect(call.data.photos).toBeUndefined();
  });

  it('rejects deleted or missing owners before uploading', async () => {
    prisma.meeting.findFirst.mockResolvedValue(null);
    await expect(
      service.upload('meeting', ownerId, file, {}),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(cloudinary.upload).not.toHaveBeenCalled();
  });

  it('removes an uploaded Cloudinary asset when persistence fails', async () => {
    prisma.image.create.mockRejectedValue(new Error('database failure'));
    await expect(service.upload('board', ownerId, file, {})).rejects.toThrow(
      'database failure',
    );
    expect(cloudinary.deleteFile).toHaveBeenCalledWith(upload.public_id);
  });

  it('does not create records after a Cloudinary failure', async () => {
    cloudinary.upload.mockRejectedValue(new Error('upload failed'));
    await expect(service.upload('jury', ownerId, file, {})).rejects.toThrow(
      'upload failed',
    );
    expect(prisma.image.create).not.toHaveBeenCalled();
  });

  it('cannot edit or delete an image from a different gallery', async () => {
    prisma.image.findFirst.mockResolvedValue(null);
    await expect(
      service.update('jury', ownerId, imageId, { title: 'title' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.remove('jury', ownerId, imageId),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.image.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: imageId, juryId: ownerId } }),
    );
    expect(prisma.image.update).not.toHaveBeenCalled();
    expect(cloudinary.deleteFile).not.toHaveBeenCalled();
  });

  it('allows clearing captions without changing the asset', async () => {
    prisma.image.findFirst.mockResolvedValue({
      ...baseImage,
      meetingId: ownerId,
    });
    await service.update('meeting', ownerId, imageId, {
      title: '',
      description: null,
    });
    expect(prisma.image.update).toHaveBeenCalledWith({
      where: { id: imageId },
      data: { title: null, description: null },
    });
    expect(cloudinary.upload).not.toHaveBeenCalled();
  });

  it('removes both the asset and the unshared record', async () => {
    prisma.image.findFirst.mockResolvedValue({
      ...baseImage,
      meetingId: ownerId,
    });
    await service.remove('meeting', ownerId, imageId);
    expect(cloudinary.deleteFile).toHaveBeenCalledWith(upload.public_id);
    expect(prisma.image.delete).toHaveBeenCalledWith({
      where: { id: imageId },
    });
  });

  it('retains a record for retry when Cloudinary deletion fails', async () => {
    prisma.image.findFirst.mockResolvedValue({
      ...baseImage,
      boardId: ownerId,
    });
    cloudinary.deleteFile.mockRejectedValue(new Error('delete failed'));
    await expect(service.remove('board', ownerId, imageId)).rejects.toThrow(
      'delete failed',
    );
    expect(prisma.image.delete).not.toHaveBeenCalled();
  });

  it('only disconnects shared images, preserving other galleries and Cloudinary', async () => {
    prisma.image.findFirst.mockResolvedValue({
      ...baseImage,
      _count: { photos: 1, supports: 1 },
    });
    await service.remove('search', ownerId, imageId, 'supports');
    expect(prisma.image.update).toHaveBeenCalledWith({
      where: { id: imageId },
      data: { supports: { disconnect: { id: ownerId } } },
    });
    expect(cloudinary.deleteFile).not.toHaveBeenCalled();
    expect(prisma.image.delete).not.toHaveBeenCalled();
  });

  it('lists only the requested collection in stable creation order', async () => {
    await service.list('search', ownerId, 'supports');
    expect(prisma.image.findMany).toHaveBeenCalledWith({
      where: { supports: { some: { id: ownerId } } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  });
});
