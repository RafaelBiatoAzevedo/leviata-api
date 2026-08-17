import { IUserJwt } from 'src/auth/jwt.strategy';
import { generateSlug } from 'src/common/utils/slug.util';

import { CloudinaryUploadOptions } from 'src/cloudinary/interfaces/CloudnaryOptions';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { News } from '@prisma/client';
import { NewsRepository } from './news.repository';
import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateNewsDto } from './dto/update.news.dto';
import { CreateNewsDto } from './dto/create-news.dto';
import { NewsQueryDto } from './dto/news-query.dto';

@Injectable()
export class NewsService {
  constructor(
    private readonly newsRepository: NewsRepository,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private folderCloudinaryName = 'leviata/images/news/';

  private async changeCover(slug: string, file: any) {
    const cloudinaryOptions: CloudinaryUploadOptions = {
      folder: `${this.folderCloudinaryName}`,
      resourceType: 'image',
      publicId: slug,
      displayName: slug,
    };

    return this.cloudinaryService.upload(file, cloudinaryOptions);
  }

  private async prepareNewsUpdate(newsFound: News, dto: UpdateNewsDto) {
    let slug = newsFound.slug;
    let coverUrl = newsFound.coverUrl;
    let coverPublicId = newsFound.coverPublicId;

    if (dto.title && dto.title !== newsFound.title) {
      const baseSlug = generateSlug(dto.title);

      let newSlug = baseSlug;
      let counter = 2;

      while (await this.newsRepository.existsSlug(newSlug, newsFound.id)) {
        newSlug = `${baseSlug}-${counter++}`;
      }

      slug = newSlug;

      if (coverPublicId) {
        const newPublicId = `${this.folderCloudinaryName}${newSlug}`;

        const result = await this.cloudinaryService.rename(
          coverPublicId,
          newPublicId,
        );

        if (result) {
          await this.cloudinaryService.updateDisplayName(
            result.public_id,
            newSlug,
          );

          coverPublicId = result.public_id;
          coverUrl = result.url;
        }
      }
    }

    return {
      ...dto,
      slug,
      coverUrl,
      coverPublicId,
    };
  }

  async create(dto: CreateNewsDto, cover?: any) {
    let coverUrl: string | undefined;
    let coverPublicId: string | undefined;
    let slug = generateSlug(dto.title);
    let counter = 2;

    while (await this.newsRepository.existsSlug(slug)) {
      slug = `${generateSlug(dto.title)}-${counter++}`;
    }

    if (cover) {
      const result = await this.changeCover(slug, cover);

      coverUrl = result.url;
      coverPublicId = result.public_id;
    }

    const NewsInput = {
      ...dto,
      slug,
      coverUrl,
      coverPublicId,
    };

    const News = await this.newsRepository.create(NewsInput);

    return News;
  }

  async findAll(query: NewsQueryDto) {
    const news = await this.newsRepository.findAll(query);

    return news;
  }

  async findOneById(id: string) {
    const News = await this.newsRepository.findById(id);

    if (!News) {
      throw new NotFoundException('News not found.');
    }

    return News;
  }

  async update(id: string, dto: UpdateNewsDto) {
    const newsFound = await this.findOneById(id);

    const NewsUpdate = await this.prepareNewsUpdate(newsFound, dto);

    return this.newsRepository.update(id, NewsUpdate);
  }

  async updateBySlug(slug: string, dto: UpdateNewsDto) {
    const newsFound = await this.findOneBySlug(slug);

    const NewsUpdate = await this.prepareNewsUpdate(newsFound, dto);

    return this.newsRepository.update(newsFound.id, NewsUpdate);
  }

  async remove(id: string, user: IUserJwt) {
    await this.findOneById(id);

    await this.newsRepository.remove(id, user.id);

    return;
  }

  async findOneBySlug(slug: string) {
    const News = await this.newsRepository.findBySlug(slug);

    if (!News) {
      throw new NotFoundException('News not found.');
    }

    return News;
  }

  async removeBySlug(slug: string, user: IUserJwt) {
    const News = await this.findOneBySlug(slug);

    await this.newsRepository.remove(News.id, user.id);

    return;
  }

  async uploadCover(slug: string, file: any) {
    const News = await this.newsRepository.findBySlug(slug);

    if (!News) {
      throw new NotFoundException('News not found.');
    }

    const result = await this.changeCover(slug, file);

    await this.newsRepository.update(News.id, {
      coverUrl: result.url,
      coverPublicId: result.public_id,
    });

    return {
      url: result.url,
      public_id: result.public_id,
    };
  }

  async removeCover(slug: string) {
    const News = await this.newsRepository.findBySlug(slug);

    if (!News) {
      throw new NotFoundException('News not found.');
    }

    await this.cloudinaryService.deleteFile(
      `${this.folderCloudinaryName}${slug}`,
    );

    await this.newsRepository.update(News.id, {
      coverUrl: null,
      coverPublicId: null,
    });
  }
}
