import { Injectable, NotFoundException } from '@nestjs/common';
import { ArticlesRepository } from './articles.repository';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { generateSlug } from 'src/common/utils/slug.util';
import { CloudinaryUploadOptions } from 'src/cloudinary/interfaces/CloudnaryOptions';
import { ArticlesQueryDto } from './dto/article-query.dto';
import { IUserJwt } from 'src/auth/jwt.strategy';
import { UpdateArticleDto } from './dto/update.article.dto';
import { Article } from '@prisma/client';

@Injectable()
export class ArticlesService {
  constructor(
    private readonly articlesRepository: ArticlesRepository,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private folderCloudinaryName = 'leviata/images/articles/';

  private changeCover(slug: string, file: any) {
    const cloudinaryOptions: CloudinaryUploadOptions = {
      folder: `${this.folderCloudinaryName}`,
      resourceType: 'image',
      publicId: slug,
      displayName: slug,
    };

    return this.cloudinaryService.upload(file, cloudinaryOptions);
  }

  private async prepareArticleUpdate(
    articleFound: Article,
    dto: UpdateArticleDto,
  ) {
    let slug = articleFound.slug;
    let coverUrl = articleFound.coverUrl;
    let coverPublicId = articleFound.coverPublicId;

    if (dto.title && dto.title !== articleFound.title) {
      const baseSlug = generateSlug(dto.title);

      let newSlug = baseSlug;
      let counter = 2;

      while (
        await this.articlesRepository.existsSlug(newSlug, articleFound.id)
      ) {
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
      ...(dto.authors! && {
        authors: {
          set: dto.authors.map((id) => ({ id })),
        },
      }),
    };
  }

  async create(dto: CreateArticleDto, cover?: any) {
    let coverUrl: string | undefined;
    let coverPublicId: string | undefined;
    let slug = generateSlug(dto.title);
    let counter = 2;

    while (await this.articlesRepository.existsSlug(slug)) {
      slug = `${generateSlug(dto.title)}-${counter++}`;
    }

    if (cover) {
      const result = await this.changeCover(slug, cover);

      coverUrl = result.url;
      coverPublicId = result.public_id;
    }

    const articleInput = {
      ...dto,
      slug,
      coverUrl,
      coverPublicId,
      ...(dto.authors && {
        authors: {
          connect: dto.authors.map((id) => ({ id })),
        },
      }),
    };

    const article = await this.articlesRepository.create(articleInput);

    return article;
  }

  async findAll(query: ArticlesQueryDto) {
    const articles = await this.articlesRepository.findAll(query);

    return articles;
  }

  async findOneById(id: string) {
    const article = await this.articlesRepository.findById(id);

    if (!article) {
      throw new NotFoundException('Article not found.');
    }

    return article;
  }

  async update(id: string, dto: UpdateArticleDto) {
    const articleFound = await this.findOneById(id);

    const articleUpdate = await this.prepareArticleUpdate(articleFound, dto);

    return this.articlesRepository.update(id, articleUpdate);
  }

  async updateBySlug(slug: string, dto: UpdateArticleDto) {
    const articleFound = await this.findOneBySlug(slug);

    const articleUpdate = await this.prepareArticleUpdate(articleFound, dto);

    return this.articlesRepository.update(articleFound.id, articleUpdate);
  }

  async remove(id: string, user: IUserJwt) {
    await this.findOneById(id);

    await this.articlesRepository.remove(id, user.id);

    return;
  }

  async findOneBySlug(slug: string) {
    const article = await this.articlesRepository.findBySlug(slug);

    if (!article) {
      throw new NotFoundException('Article not found.');
    }

    return article;
  }

  async removeBySlug(slug: string, user: IUserJwt) {
    const article = await this.findOneBySlug(slug);

    await this.articlesRepository.remove(article.id, user.id);

    return;
  }

  async uploadCover(slug: string, file: any) {
    const article = await this.articlesRepository.findBySlug(slug);

    if (!article) {
      throw new NotFoundException('Article not found.');
    }

    const result = await this.changeCover(slug, file);

    await this.articlesRepository.update(article.id, {
      coverUrl: result.url,
      coverPublicId: result.public_id,
    });

    return {
      url: result.url,
      public_id: result.public_id,
    };
  }

  async removeCover(slug: string) {
    const article = await this.articlesRepository.findBySlug(slug);

    if (!article) {
      throw new NotFoundException('Article not found.');
    }

    await this.cloudinaryService.deleteFile(
      `${this.folderCloudinaryName}${slug}`,
    );

    await this.articlesRepository.update(article.id, {
      coverUrl: null,
      coverPublicId: null,
    });
  }
}
