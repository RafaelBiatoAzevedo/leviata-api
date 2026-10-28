import { ConflictException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NewsletterDocumentsService } from './newsletter-documents.service';
import {
  NewsletterPdfService,
  newsletterPdfFilename,
  newsletterPdfHash,
} from './newsletter-pdf.service';
import { publicPdfAddress } from './pdf-assets';
import { newsletterContent } from '../../../test/fixtures/newsletter-content';
import { renderNewsletter } from '../newsletter-renderer';

describe('Newsletter PDF documents', () => {
  it.each([
    '127.0.0.1',
    '10.0.0.1',
    '172.16.2.1',
    '192.168.0.1',
    '169.254.169.254',
    '100.64.0.1',
    '::1',
    'fe80::1',
    'fc00::1',
    '::ffff:127.0.0.1',
  ])('blocks private asset address %s', (address) => {
    expect(publicPdfAddress(address)).toBe(false);
  });
  it.each(['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111'])(
    'allows a public asset address %s',
    (address) => {
      expect(publicPdfAddress(address)).toBe(true);
    },
  );
  it('reuses the PDF only when its source HTML matches', async () => {
    const htmlContent = '<h1>Texto original</h1>';
    const content = Buffer.from('%PDF original');
    const findFirst = jest.fn().mockResolvedValue({
      id: 'one',
      slug: 'boletim',
      htmlContent,
      pdfContent: content,
      pdfSourceHash: newsletterPdfHash(htmlContent),
    });
    const render = jest.fn();
    const service = new NewsletterDocumentsService(
      { newsletter: { findFirst } } as unknown as PrismaService,
      { render } as unknown as NewsletterPdfService,
    );
    expect((await service.ensure('one')).content).toEqual(content);
    expect(render).not.toHaveBeenCalled();
  });
  it('does not save a PDF for a stale HTML version when the edition changes during rendering', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    const findFirst = jest.fn().mockResolvedValue({
      id: 'one',
      slug: 'boletim',
      htmlContent: '<p>Original</p>',
      pdfContent: null,
      updatedAt: new Date('2026-10-28T12:00:00.000Z'),
    });
    const render = jest.fn().mockResolvedValue(Buffer.from('%PDF generated'));
    const service = new NewsletterDocumentsService(
      { newsletter: { findFirst, updateMany } } as unknown as PrismaService,
      { render } as unknown as NewsletterPdfService,
    );
    await expect(service.ensure('one')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'one',
          htmlContent: '<p>Original</p>',
          updatedAt: new Date('2026-10-28T12:00:00.000Z'),
          deletedAt: null,
        },
      }),
    );
  });
  it('regenerates saved visual HTML and PDF together when the renderer layout changes', async () => {
    const contentData = newsletterContent();
    contentData.template = 'CLASSIC';
    const stored = {
      id: 'one',
      slug: 'boletim',
      title: 'Edição',
      subject: 'Novidades',
      coverUrl: null,
      contentData,
      htmlContent: '<p>Layout antigo</p>',
      pdfContent: Buffer.from('%PDF old'),
      pdfSourceHash: newsletterPdfHash('<p>Layout antigo</p>'),
      updatedAt: new Date('2026-10-28T12:00:00.000Z'),
    };
    const findFirst = jest.fn().mockResolvedValue(stored);
    const updateMany = jest
      .fn<Promise<{ count: number }>, [Prisma.NewsletterUpdateManyArgs]>()
      .mockResolvedValue({ count: 1 });
    const render = jest
      .fn<Promise<Buffer>, [string]>()
      .mockResolvedValue(Buffer.from('%PDF new'));
    const service = new NewsletterDocumentsService(
      { newsletter: { findFirst, updateMany } } as unknown as PrismaService,
      { render } as unknown as NewsletterPdfService,
    );
    const htmlContent = renderNewsletter({ ...stored, contentData });
    const result = await service.ensure('one');
    expect(render).toHaveBeenCalledWith(htmlContent);
    expect(result.newsletter.htmlContent).toBe(htmlContent);
    expect(result.content.toString()).toBe('%PDF new');
    const update = updateMany.mock.calls[0][0];
    expect(update.where).toEqual({
      id: stored.id,
      htmlContent: stored.htmlContent,
      updatedAt: stored.updatedAt,
      deletedAt: null,
    });
    expect(update.data.htmlContent).toBe(htmlContent);
    expect(update.data.pdfSourceHash).toBe(newsletterPdfHash(htmlContent));
  });
  it('invalidates PDFs generated before the pagination layout version changed', () => {
    const { createHash } =
      jest.requireActual<typeof import('node:crypto')>('node:crypto');
    const html = '<p>Texto preservado</p>';
    const previousHash = createHash('sha256').update(html).digest('hex');
    const intermediateHash = createHash('sha256')
      .update('newsletter-pdf-layout-v2\0')
      .update(html)
      .digest('hex');
    const centeredLayoutHash = createHash('sha256')
      .update('newsletter-pdf-layout-v3\0')
      .update(html)
      .digest('hex');
    expect(newsletterPdfHash(html)).not.toBe(previousHash);
    expect(newsletterPdfHash(html)).not.toBe(intermediateHash);
    expect(newsletterPdfHash(html)).not.toBe(centeredLayoutHash);
    expect(newsletterPdfHash(html)).toBe(newsletterPdfHash(html));
  });
  it('uses a safe PDF attachment filename', () => {
    expect(newsletterPdfFilename('edicao\r\n"../junho')).toBe(
      'edicao------junho.pdf',
    );
  });
});
