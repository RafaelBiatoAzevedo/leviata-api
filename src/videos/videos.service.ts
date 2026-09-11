import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { generateSlug } from 'src/common/utils/slug.util';
import { IUserJwt } from 'src/auth/jwt.strategy';
import { VideosRepository } from './videos.repository';
import { UpdateVideoDto } from './DTOs/update-video.dto';
import { VideosQueryDto } from './DTOs/video-query.dto';
import { CreateVideoDto } from './DTOs/create-video.dto';
import { Video } from '@prisma/client';

@Injectable()
export class VideosService {
  constructor(private readonly videosRepository: VideosRepository) {}

  private getEmbedLink(videoUrl: string): string {
    const url = new URL(videoUrl);

    let videoId: string | null = null;

    if (url.hostname.includes('youtu.be')) {
      videoId = url.pathname.slice(1);
    } else if (url.hostname.includes('youtube.com')) {
      videoId = url.searchParams.get('v');

      if (!videoId && url.pathname.startsWith('/embed/')) {
        videoId = url.pathname.split('/embed/')[1];
      }
    }

    if (!videoId) {
      throw new BadRequestException('URL do vídeo do YouTube inválida.');
    }

    return `https://www.youtube.com/embed/${videoId}`;
  }

  private async prepareVideoUpdate(videoFound: Video, dto: UpdateVideoDto) {
    let slug = videoFound.slug;

    if (dto.title && dto.title !== videoFound.title) {
      const baseSlug = generateSlug(dto.title);

      let newSlug = baseSlug;
      let counter = 2;

      while (await this.videosRepository.existsSlug(newSlug, videoFound.id)) {
        newSlug = `${baseSlug}-${counter++}`;
      }

      slug = newSlug;
    }

    const { videoUrl, people, ...videoData } = dto;

    return {
      ...videoData,

      slug,

      ...(videoUrl && {
        embedLink: this.getEmbedLink(videoUrl),
      }),

      ...(people && {
        people: {
          set: people.map((id) => ({
            id,
          })),
        },
      }),
    };
  }

  async create(dto: CreateVideoDto) {
    let slug = generateSlug(dto.title);
    let counter = 2;

    while (await this.videosRepository.existsSlug(slug)) {
      slug = `${generateSlug(dto.title)}-${counter++}`;
    }

    const { videoUrl, ...videoData } = dto;

    const embedLink = this.getEmbedLink(videoUrl);

    const videoInput = {
      ...videoData,
      slug,
      embedLink,
      people: {
        connect: dto.people!.map((id) => ({
          id,
        })),
      },
    };

    const video = await this.videosRepository.create(videoInput);

    return video;
  }

  async findAll(query: VideosQueryDto) {
    const videos = await this.videosRepository.findAll(query);

    return videos;
  }

  async findOneById(id: string) {
    const video = await this.videosRepository.findById(id);

    if (!video) {
      throw new NotFoundException('Video not found.');
    }

    return video;
  }

  async update(id: string, dto: UpdateVideoDto) {
    const videoFound = await this.findOneById(id);

    const videoUpdate = await this.prepareVideoUpdate(videoFound, dto);

    return this.videosRepository.update(videoFound.id, videoUpdate);
  }

  async updateBySlug(slug: string, dto: UpdateVideoDto) {
    const videoFound = await this.findOneBySlug(slug);

    const videoUpdate = await this.prepareVideoUpdate(videoFound, dto);

    return this.videosRepository.update(videoFound.id, videoUpdate);
  }

  async remove(id: string, user: IUserJwt) {
    const videoFound = await this.findOneById(id);

    await this.videosRepository.remove(videoFound.id, user.id);

    return;
  }

  async findOneBySlug(slug: string) {
    const videoFound = await this.videosRepository.findBySlug(slug);

    if (!videoFound) {
      throw new NotFoundException('Video not found.');
    }

    return videoFound;
  }

  async removeBySlug(slug: string, user: IUserJwt) {
    const videoFound = await this.findOneBySlug(slug);

    await this.videosRepository.remove(videoFound.id, user.id);

    return;
  }
}
