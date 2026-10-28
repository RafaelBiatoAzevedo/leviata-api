import { Test, TestingModule } from '@nestjs/testing';
import { NewsletterService } from './newsletter.service';
import { NewsletterRepository } from './newsletter.repository';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { NewsletterPdfService } from './pdf/newsletter-pdf.service';
import { NewsletterDocumentsService } from './pdf/newsletter-documents.service';
import type { Newsletter, Prisma } from '@prisma/client';
import { newsletterContent } from '../../test/fixtures/newsletter-content';

describe('NewsletterService', () => {
  let service: NewsletterService;
  const found = {
    id: 'edition-id',
    slug: 'edicao',
    title: 'Edição',
    subject: 'Leviatã News',
    htmlContent: '<p>Edição anterior</p>',
    contentData: null,
    publishedAt: new Date('2023-10-01T00:00:00.000Z'),
    sentAt: null,
  } as Omit<Newsletter, 'pdfContent'>;
  const repository = {
    existsSlug: jest.fn(),
    create: jest.fn(),
    update: jest.fn<Promise<unknown>, [string, Prisma.NewsletterUpdateInput]>(),
    findById: jest.fn(),
    findBySlug: jest.fn(),
  };
  const pdf = { render: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    repository.existsSlug.mockResolvedValue(false);
    repository.findById.mockResolvedValue(found);
    repository.findBySlug.mockResolvedValue(found);
    pdf.render.mockResolvedValue(Buffer.from('%PDF-1.7'));
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsletterService,
        { provide: NewsletterRepository, useValue: repository },
        { provide: CloudinaryService, useValue: {} },
        { provide: NewsletterPdfService, useValue: pdf },
        { provide: NewsletterDocumentsService, useValue: {} },
      ],
    }).compile();

    service = module.get<NewsletterService>(NewsletterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('saves visual content with a date-only publication as UTC midnight and its generated PDF', async () => {
    await service.create({
      title: 'Confira as últimas novidades',
      subject: 'Leviatã News',
      publishedAt: '2023-10-01',
      contentData: newsletterContent(),
    });
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        publishedAt: new Date('2023-10-01T00:00:00.000Z'),
        pdfContent: new Uint8Array(Buffer.from('%PDF-1.7')),
      }),
    );
    expect(pdf.render).toHaveBeenCalledTimes(1);
  });

  it.each(['id', 'slug'])(
    'converts date-only and full timestamps when updating by %s',
    async (identifier) => {
      const dto = {
        publishedAt: '2023-10-02',
        sentAt: '2026-10-28T09:00:00-03:00',
      };
      if (identifier === 'id') await service.update(found.id, dto);
      else await service.updateBySlug(found.slug, dto);
      expect(repository.update).toHaveBeenCalledWith(
        found.id,
        expect.objectContaining({
          publishedAt: new Date('2023-10-02T00:00:00.000Z'),
          sentAt: new Date('2026-10-28T12:00:00.000Z'),
        }),
      );
    },
  );

  it('does not clear omitted dates or introduce invalid dates on partial updates', async () => {
    await service.update(found.id, { subject: 'Novo assunto' });
    const changes = repository.update.mock.calls[0][1];
    expect(changes.publishedAt).toBeUndefined();
    expect(changes.sentAt).toBeUndefined();
  });
});
