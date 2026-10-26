import { Injectable, NotFoundException } from '@nestjs/common';
import { Newsletter } from '@prisma/client';
import { IUserJwt } from '../auth/jwt.strategy';
import { generateSlug } from '../common/utils/slug.util';
import { CreateNewsletterDto } from './DTOs/create-newsletter.dto';
import { NewsletterQueryDto } from './DTOs/newsletter-query.dto';
import { UpdateNewsletterDto } from './DTOs/update-newsletter.dto';
import { NewsletterRepository } from './newsletter.repository';
import { SubscribeNewsletterDto } from './DTOs/subscribe-newsletter.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class NewsletterService {
  constructor(
    private readonly newsletterRepository: NewsletterRepository,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private readonly coverFolder = 'leviata/images/newsletter/';

  private uploadCover(file: Express.Multer.File, slug: string) {
    return this.cloudinaryService.upload(file, {
      folder: this.coverFolder,
      resourceType: 'image',
      publicId: slug,
      displayName: slug,
    });
  }

  async subscribe(dto: SubscribeNewsletterDto) {
    await this.newsletterRepository.subscribe({
      email: dto.email.trim().toLowerCase(),
      name: dto.name?.trim() || undefined,
      cellphone: dto.cellphone?.trim() || undefined,
    });
    return { message: 'Inscrição realizada com sucesso.' };
  }

  private async uniqueSlug(title: string, ignoreId?: string) {
    const baseSlug = generateSlug(title);
    let slug = baseSlug;
    let counter = 2;

    while (await this.newsletterRepository.existsSlug(slug, ignoreId)) {
      slug = `${baseSlug}-${counter++}`;
    }

    return slug;
  }

  async create(dto: CreateNewsletterDto, cover?: Express.Multer.File) {
    const slug = await this.uniqueSlug(dto.title);
    const image = cover ? await this.uploadCover(cover, slug) : undefined;
    return this.newsletterRepository.create({
      ...dto,
      slug,
      ...(image && {
        coverUrl: image.secure_url,
        coverPublicId: image.public_id,
      }),
    });
  }

  async updateCover(slug: string, cover: Express.Multer.File) {
    const found = await this.findOneBySlug(slug);
    const publicId = found.coverPublicId?.startsWith(this.coverFolder)
      ? found.coverPublicId.slice(this.coverFolder.length)
      : found.slug;
    const image = await this.uploadCover(cover, publicId);
    await this.newsletterRepository.update(found.id, {
      coverUrl: image.secure_url,
      coverPublicId: image.public_id,
    });
    return { url: image.secure_url, public_id: image.public_id };
  }

  findPage(query: NewsletterQueryDto) {
    return this.newsletterRepository.findPage(query);
  }

  findAll(query: NewsletterQueryDto) {
    return this.newsletterRepository.findAll(query);
  }

  async findOneById(id: string) {
    const newsletter = await this.newsletterRepository.findById(id);
    if (!newsletter) throw new NotFoundException('Newsletter not found.');
    return newsletter;
  }

  async findOneBySlug(slug: string) {
    const newsletter = await this.newsletterRepository.findBySlug(slug);
    if (!newsletter) throw new NotFoundException('Newsletter not found.');
    return newsletter;
  }

  private async prepareUpdate(found: Newsletter, dto: UpdateNewsletterDto) {
    return {
      ...dto,
      slug:
        dto.title && dto.title !== found.title
          ? await this.uniqueSlug(dto.title, found.id)
          : found.slug,
    };
  }

  async update(id: string, dto: UpdateNewsletterDto) {
    const found = await this.findOneById(id);
    return this.newsletterRepository.update(
      found.id,
      await this.prepareUpdate(found, dto),
    );
  }

  async updateBySlug(slug: string, dto: UpdateNewsletterDto) {
    const found = await this.findOneBySlug(slug);
    return this.newsletterRepository.update(
      found.id,
      await this.prepareUpdate(found, dto),
    );
  }

  async remove(id: string, user: IUserJwt) {
    const found = await this.findOneById(id);
    await this.newsletterRepository.remove(found.id, user.id);
  }

  async removeBySlug(slug: string, user: IUserJwt) {
    const found = await this.findOneBySlug(slug);
    await this.newsletterRepository.remove(found.id, user.id);
  }
}
