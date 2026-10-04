import type { GalleryFile } from './gallery-file';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ImageMetadataDto } from './DTOs/image-metadata.dto';

export type ImageOwner =
  | 'board'
  | 'jury'
  | 'meeting'
  | 'presentedWork'
  | 'search';
export type ImageCollection = 'images' | 'supports';

const folders: Record<ImageOwner, string> = {
  board: 'boards',
  jury: 'juries',
  meeting: 'meetings',
  presentedWork: 'presented-works',
  search: 'research',
};

@Injectable()
export class ImagesService {
  private readonly logger = new Logger(ImagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  private async requireOwner(owner: ImageOwner, id: string) {
    const where = { id, deletedAt: null };
    const select = { id: true };
    let record: { id: string } | null;
    switch (owner) {
      case 'board':
        record = await this.prisma.board.findFirst({ where, select });
        break;
      case 'jury':
        record = await this.prisma.jury.findFirst({ where, select });
        break;
      case 'meeting':
        record = await this.prisma.meeting.findFirst({ where, select });
        break;
      case 'presentedWork':
        record = await this.prisma.presentedWork.findFirst({ where, select });
        break;
      case 'search':
        record = await this.prisma.search.findFirst({ where, select });
        break;
    }
    if (!record) throw new NotFoundException('Registro não encontrado.');
  }

  private relationWhere(
    owner: ImageOwner,
    id: string,
    collection: ImageCollection,
  ): Prisma.ImageWhereInput {
    if (owner === 'search') {
      return collection === 'supports'
        ? { supports: { some: { id } } }
        : { photos: { some: { id } } };
    }
    return { [`${owner}Id`]: id };
  }

  private metadata(dto: ImageMetadataDto) {
    return {
      ...(dto.title !== undefined && { title: dto.title?.trim() || null }),
      ...(dto.description !== undefined && {
        description: dto.description?.trim() || null,
      }),
    };
  }

  async list(
    owner: ImageOwner,
    id: string,
    collection: ImageCollection = 'images',
  ) {
    await this.requireOwner(owner, id);
    return this.prisma.image.findMany({
      where: this.relationWhere(owner, id, collection),
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  async upload(
    owner: ImageOwner,
    id: string,
    file: GalleryFile,
    dto: ImageMetadataDto,
    collection: ImageCollection = 'images',
  ) {
    await this.requireOwner(owner, id);
    const uploaded = await this.cloudinary.upload(file, {
      folder: `leviata/images/${folders[owner]}/${id}/${collection}`,
      publicId: randomUUID(),
      resourceType: 'image',
      displayName: dto.title?.trim() || file.originalname,
    });

    const relation: Prisma.ImageUncheckedCreateInput = {
      imageUrl: uploaded.secure_url,
      publicId: uploaded.public_id,
      ...this.metadata(dto),
      ...(owner === 'search'
        ? collection === 'supports'
          ? { supports: { connect: { id } } }
          : { photos: { connect: { id } } }
        : { [`${owner}Id`]: id }),
    };

    try {
      return await this.prisma.image.create({ data: relation });
    } catch (error) {
      try {
        await this.cloudinary.deleteFile(uploaded.public_id);
      } catch {
        this.logger.error(`Falha ao limpar upload ${uploaded.public_id}.`);
      }
      throw error;
    }
  }

  private async findImage(
    owner: ImageOwner,
    id: string,
    imageId: string,
    collection: ImageCollection,
  ) {
    await this.requireOwner(owner, id);
    const image = await this.prisma.image.findFirst({
      where: { id: imageId, ...this.relationWhere(owner, id, collection) },
      include: { _count: { select: { photos: true, supports: true } } },
    });
    if (!image)
      throw new NotFoundException('Imagem não encontrada nesta galeria.');
    return image;
  }

  async update(
    owner: ImageOwner,
    id: string,
    imageId: string,
    dto: ImageMetadataDto,
    collection: ImageCollection = 'images',
  ) {
    await this.findImage(owner, id, imageId, collection);
    return this.prisma.image.update({
      where: { id: imageId },
      data: this.metadata(dto),
    });
  }

  async remove(
    owner: ImageOwner,
    id: string,
    imageId: string,
    collection: ImageCollection = 'images',
  ) {
    const image = await this.findImage(owner, id, imageId, collection);
    const links =
      [
        image.boardId,
        image.juryId,
        image.meetingId,
        image.presentedWorkId,
      ].filter(Boolean).length +
      image._count.photos +
      image._count.supports;

    // Pesquisas podem compartilhar uma imagem: remova somente o vínculo atual.
    if (links > 1) {
      await this.prisma.image.update({
        where: { id: imageId },
        data:
          owner === 'search'
            ? collection === 'supports'
              ? { supports: { disconnect: { id } } }
              : { photos: { disconnect: { id } } }
            : { [`${owner}Id`]: null },
      });
      return;
    }

    if (image.publicId) await this.cloudinary.deleteFile(image.publicId);
    await this.prisma.image.delete({ where: { id: imageId } });
  }
}
