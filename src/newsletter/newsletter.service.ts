import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Newsletter, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { IUserJwt } from '../auth/jwt.strategy';
import { generateSlug } from '../common/utils/slug.util';
import { CreateNewsletterDto } from './DTOs/create-newsletter.dto';
import { NewsletterQueryDto } from './DTOs/newsletter-query.dto';
import { UpdateNewsletterDto } from './DTOs/update-newsletter.dto';
import { NewsletterRepository } from './newsletter.repository';
import { SubscribeNewsletterDto } from './DTOs/subscribe-newsletter.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { NewsletterContentDto } from './DTOs/newsletter-content.dto';
import { NewsletterPreviewDto } from './DTOs/newsletter-preview.dto';
import { hasNewsletterContent, renderNewsletter } from './newsletter-renderer';
import {
  NewsletterPdfService,
  newsletterPdfHash,
  newsletterPdfPath,
} from './pdf/newsletter-pdf.service';
import { NewsletterDocumentsService } from './pdf/newsletter-documents.service';

@Injectable()
export class NewsletterService {
  constructor(
    private readonly newsletterRepository: NewsletterRepository,
    private readonly cloudinaryService: CloudinaryService,
    private readonly pdf: NewsletterPdfService,
    private readonly documents: NewsletterDocumentsService,
  ) {}

  private readonly coverFolder = 'leviata/images/newsletter/';

  private dates(dto: { publishedAt?: string | null; sentAt?: string | null }) {
    // Date inputs send YYYY-MM-DD; persist that calendar day at midnight UTC.
    return {
      ...(dto.publishedAt !== undefined && {
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : null,
      }),
      ...(dto.sentAt !== undefined && {
        sentAt: dto.sentAt ? new Date(dto.sentAt) : null,
      }),
    };
  }

  private uploadCover(file: Express.Multer.File, slug: string) {
    return this.cloudinaryService.upload(file, {
      folder: this.coverFolder,
      resourceType: 'image',
      publicId: slug,
      displayName: slug,
    });
  }

  async uploadContentImage(file: Express.Multer.File) {
    const image = await this.cloudinaryService.upload(file, {
      folder: `${this.coverFolder}content/`,
      resourceType: 'image',
      publicId: randomUUID(),
    });
    return { url: image.secure_url, public_id: image.public_id };
  }

  preview(dto: NewsletterPreviewDto) {
    return { htmlContent: renderNewsletter(dto, true) };
  }

  private content(
    dto: CreateNewsletterDto | UpdateNewsletterDto,
    found?: Omit<Newsletter, 'pdfContent'>,
  ) {
    const contentData =
      dto.contentData ??
      (found?.contentData as unknown as NewsletterContentDto | undefined);
    if (contentData?.mode === 'visual' && !hasNewsletterContent(contentData)) {
      throw new BadRequestException(
        'Adicione pelo menos um conteúdo com título ou texto.',
      );
    }
    const htmlContent = renderNewsletter({ ...found, ...dto, contentData });
    if (!htmlContent.trim())
      throw new BadRequestException('Informe o conteúdo da newsletter.');
    return {
      htmlContent,
      ...(contentData && {
        contentData: contentData as unknown as Prisma.InputJsonValue,
      }),
    };
  }

  private async pdfFields(
    id: string,
    htmlContent: string,
    previous?: Omit<Newsletter, 'pdfContent'>,
  ) {
    const hash = newsletterPdfHash(htmlContent);
    if (previous?.pdfGeneratedAt && previous.pdfSourceHash === hash) return {};
    const content = await this.pdf.render(htmlContent);
    return {
      pdfContent: new Uint8Array(content),
      pdfSourceHash: hash,
      pdfGeneratedAt: new Date(),
      pdfUrl: newsletterPdfPath(id),
    };
  }

  async downloadPdf(id: string, user?: IUserJwt) {
    const found = await this.findOneById(id);
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const published =
      found.publishedAt &&
      found.publishedAt.toISOString().slice(0, 10) <= today;
    if (!published && !['ADMIN', 'SUPER_ADMIN'].includes(user?.role ?? ''))
      throw new NotFoundException('Newsletter não publicada.');
    return this.documents.ensure(id);
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
    // Validate the draft before uploading and render with the permanent cover URL.
    this.content(dto);
    const image = cover ? await this.uploadCover(cover, slug) : undefined;
    const { contentData, ...fields } = dto;
    const id = randomUUID();
    const content = this.content({
      ...fields,
      contentData,
      ...(image && { coverUrl: image.secure_url }),
    });
    const document = await this.pdfFields(id, content.htmlContent);
    return this.newsletterRepository.create({
      id,
      ...fields,
      ...this.dates(dto),
      ...content,
      ...document,
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
    const content = this.content({ coverUrl: image.secure_url }, found);
    const document = await this.pdfFields(found.id, content.htmlContent, found);
    await this.newsletterRepository.update(found.id, {
      coverUrl: image.secure_url,
      coverPublicId: image.public_id,
      ...content,
      ...document,
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

  private async prepareUpdate(
    found: Omit<Newsletter, 'pdfContent'>,
    dto: UpdateNewsletterDto,
  ) {
    const { contentData, ...fields } = dto;
    const content = this.content({ ...fields, contentData }, found);
    return {
      ...fields,
      ...this.dates(dto),
      ...content,
      ...(await this.pdfFields(found.id, content.htmlContent, found)),
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
