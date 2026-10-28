// Uses the real PDF generator and PostgreSQL, and rolls back every test record.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { ValidationPipe } = require('@nestjs/common');
require('dotenv').config({ quiet: true });
const { PrismaService } = require('../dist/src/prisma/prisma.service.js');
const {
  NewsletterRepository,
} = require('../dist/src/newsletter/newsletter.repository.js');
const {
  NewsletterService,
} = require('../dist/src/newsletter/newsletter.service.js');
const {
  CreateNewsletterDto,
} = require('../dist/src/newsletter/DTOs/create-newsletter.dto.js');
const {
  NewsletterPdfService,
} = require('../dist/src/newsletter/pdf/newsletter-pdf.service.js');
const {
  NewsletterDocumentsService,
} = require('../dist/src/newsletter/pdf/newsletter-documents.service.js');

async function main() {
  const prisma = new PrismaService();
  const title = `integration-newsletter-${randomUUID()}`;
  const rollback = new Error('Expected test rollback');
  const story = (title, text) => ({
    id: randomUUID(),
    title,
    text,
    details: '',
    imageUrl: '',
    imageAlt: '',
    linkUrl: '',
    linkLabel: 'Saiba mais',
  });
  const input = {
    title,
    subject: 'Leviatã News',
    publishedAt: '2023-10-01',
    contentData: {
      version: 1,
      mode: 'visual',
      template: 'CLASSIC',
      background: 'paper',
      frame: 'double',
      masthead: 'Leviatã News',
      tagline: 'Confira as últimas notícias do Grupo Leviatã e o Cativeiro!',
      editionLabel: '',
      intro: '',
      footer:
        'Grupo de Pesquisa Leviatã e o Cativeiro\nHistória, pesquisa e conhecimento em diálogo.',
      sections: [
        {
          id: randomUUID(),
          title: 'Aconteceu',
          layout: 'stories',
          items: [
            story(
              '11° Encontro Escravidão e Liberdade',
              'Participação dos membros do grupo em Pelotas.',
            ),
            story(
              'XXXV Congresso de Iniciação Científica da UNESP',
              'Participação das graduandas do curso de História.',
            ),
          ],
        },
      ],
    },
  };
  try {
    await prisma.$connect();
    await prisma
      .$transaction(
        async (tx) => {
          const pdf = new NewsletterPdfService();
          const service = new NewsletterService(
            new NewsletterRepository(tx),
            {
              upload() {
                throw new Error('No image upload expected.');
              },
            },
            pdf,
            new NewsletterDocumentsService(tx, pdf),
          );
          const dto = await new ValidationPipe({
            transform: true,
            whitelist: true,
            forbidNonWhitelisted: true,
          }).transform(input, { type: 'body', metatype: CreateNewsletterDto });
          const saved = await service.create(dto);
          assert.equal(
            saved.publishedAt.toISOString(),
            '2023-10-01T00:00:00.000Z',
          );
          assert.equal(saved.sentAt, null);
          assert.deepEqual(
            saved.contentData.sections,
            input.contentData.sections,
          );
          assert.ok(
            saved.htmlContent.includes('11° Encontro Escravidão e Liberdade'),
          );
          assert.ok(
            saved.htmlContent.includes(
              'XXXV Congresso de Iniciação Científica da UNESP',
            ),
          );
          assert.equal(Object.hasOwn(saved, 'pdfContent'), false);
          const document = await service.downloadPdf(saved.id);
          assert.equal(document.content.subarray(0, 5).toString(), '%PDF-');
          assert.ok(document.content.length > 1000);
          const updated = await service.updateBySlug(saved.slug, {
            publishedAt: '2023-10-02',
          });
          assert.equal(
            updated.publishedAt.toISOString(),
            '2023-10-02T00:00:00.000Z',
          );
          assert.equal(updated.pdfSourceHash, saved.pdfSourceHash);
          const timed = await service.update(saved.id, {
            sentAt: '2026-10-28T09:00:00-03:00',
          });
          assert.equal(timed.sentAt.toISOString(), '2026-10-28T12:00:00.000Z');
          assert.equal(
            timed.publishedAt.toISOString(),
            '2023-10-02T00:00:00.000Z',
          );
          const cleared = await service.update(saved.id, {
            publishedAt: null,
            sentAt: null,
          });
          assert.equal(cleared.publishedAt, null);
          assert.equal(cleared.sentAt, null);
          console.log(
            `PASS: create, edit, UTC publication day, generated PDF (${document.content.length} bytes) and download.`,
          );
          throw rollback;
        },
        { timeout: 60000 },
      )
      .catch((error) => {
        if (error !== rollback) throw error;
      });
    assert.equal(await prisma.newsletter.count({ where: { title } }), 0);
    console.log(
      'PASS: all integration records rolled back; no email campaign created.',
    );
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
