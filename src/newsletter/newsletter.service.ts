import { Injectable, NotFoundException } from '@nestjs/common';
import { Newsletter } from '@prisma/client';
import { IUserJwt } from '../auth/jwt.strategy';
import { generateSlug } from '../common/utils/slug.util';
import { CreateNewsletterDto } from './DTOs/create-newsletter.dto';
import { NewsletterQueryDto } from './DTOs/newsletter-query.dto';
import { UpdateNewsletterDto } from './DTOs/update-newsletter.dto';
import { NewsletterRepository } from './newsletter.repository';

@Injectable()
export class NewsletterService {
  constructor(private readonly newsletterRepository: NewsletterRepository) {}

  private async uniqueSlug(title: string, ignoreId?: string) {
    const baseSlug = generateSlug(title);
    let slug = baseSlug;
    let counter = 2;

    while (await this.newsletterRepository.existsSlug(slug, ignoreId)) {
      slug = `${baseSlug}-${counter++}`;
    }

    return slug;
  }

  async create(dto: CreateNewsletterDto) {
    return this.newsletterRepository.create({
      ...dto,
      slug: await this.uniqueSlug(dto.title),
    });
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
