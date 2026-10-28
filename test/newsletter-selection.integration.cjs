// Uses PostgreSQL in a rollback-only transaction. SMTP and the worker are never started.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { ConfigService } = require('@nestjs/config');
const { ValidationPipe } = require('@nestjs/common');
require('dotenv').config({ quiet: true });
const { PrismaService } = require('../dist/src/prisma/prisma.service.js');
const { MailConfig } = require('../dist/src/mail/mail.config.js');
const {
  MailNewslettersService,
} = require('../dist/src/mail/mail-newsletters.service.js');
const { MailSendDto } = require('../dist/src/mail/mail.dto.js');
const {
  newsletterPdfHash,
} = require('../dist/src/newsletter/pdf/newsletter-pdf.service.js');

async function main() {
  const prisma = new PrismaService();
  const prefix = `selection-integration-${randomUUID()}`;
  const rollback = new Error('Expected rollback');
  let smtpCalls = 0;
  try {
    await prisma.$connect();
    await prisma
      .$transaction(
        async (tx) => {
          const db = new Proxy(tx, {
            get(target, property) {
              if (property === '$transaction')
                return (action) =>
                  typeof action === 'function'
                    ? action(db)
                    : Promise.all(action);
              return Reflect.get(target, property);
            },
          });
          const service = new MailNewslettersService(
            db,
            new MailConfig(
              new ConfigService({
                MAIL_ENABLED: 'true',
                MAIL_WORKER_ENABLED: 'false',
                MAIL_AUTH_MODE: 'app-password',
                MAIL_GMAIL_APP_PASSWORD: 'test-not-a-real-password',
                MAIL_UNSUBSCRIBE_SECRET:
                  'integration-test-secret-more-than-32-characters',
              }),
            ),
            {
              send() {
                smtpCalls++;
                throw new Error('No SMTP calls expected.');
              },
            },
            {},
            { async ensure() {} },
            {},
          );
          const subscriber = (name, extra = {}) =>
            tx.newsletterSubscriber.create({
              data: {
                name: `${prefix} ${name}`,
                email: `${randomUUID()}@example.test`,
                ...extra,
              },
            });
          const first = await subscriber('Ana');
          const second = await subscriber('Bruno');
          const optOut = await subscriber('Opt-out', { allowEmail: false });
          await subscriber('Inactive', { isActive: false });
          await subscriber('Deleted', { deletedAt: new Date() });
          await subscriber('Invalid', { email: `${prefix}-invalid` });
          const previous = await subscriber('Previous');
          const htmlContent =
            '<p>Snapshot da edição para seleção de destinatários</p>';
          const edition = (suffix) =>
            tx.newsletter.create({
              data: {
                title: `${prefix}-${suffix}`,
                slug: `${prefix}-${suffix}`,
                subject: 'Leviatã News',
                htmlContent,
                publishedAt: new Date('2020-01-01'),
                pdfContent: new Uint8Array(Buffer.from('%PDF-test')),
                pdfSourceHash: newsletterPdfHash(htmlContent),
              },
            });
          const chosenEdition = await edition('chosen');
          await tx.newsletterDelivery.create({
            data: {
              newsletterId: chosenEdition.id,
              subscriberId: previous.id,
              sentAt: new Date(),
            },
          });
          const listed = await service.subscribers(chosenEdition.id, {
            page: 1,
            limit: 100,
            search: prefix,
          });
          assert.deepEqual(
            listed.items.map((item) => item.id).sort(),
            [first.id, second.id].sort(),
          );
          assert.equal(listed.total, 2);
          const page = await service.subscribers(chosenEdition.id, {
            page: 2,
            limit: 1,
            search: prefix,
          });
          assert.equal(page.total, 2);
          assert.equal(page.items[0].id, second.id);
          const byEmail = await service.subscribers(chosenEdition.id, {
            page: 1,
            limit: 10,
            search: first.email,
          });
          assert.deepEqual(
            byEmail.items.map((item) => item.id),
            [first.id],
          );

          const pipe = new ValidationPipe({
            transform: true,
            whitelist: true,
            forbidNonWhitelisted: true,
          });
          for (const body of [
            { mode: 'SELECTED' },
            { mode: 'SELECTED', subscriberIds: [] },
            { mode: 'SELECTED', subscriberIds: [first.id, first.id] },
          ])
            await assert.rejects(
              pipe.transform(body, { type: 'body', metatype: MailSendDto }),
            );
          await assert.rejects(
            service.enqueue(chosenEdition.id, randomUUID(), {
              mode: 'SELECTED',
              subscriberIds: [first.id, optOut.id],
            }),
            /não estão aptos/,
          );
          await assert.rejects(
            service.enqueue(chosenEdition.id, randomUUID(), {
              mode: 'SELECTED',
              subscriberIds: [previous.id],
            }),
            /não estão aptos/,
          );
          assert.equal(
            await tx.newsletterMailCampaign.count({
              where: { newsletterId: chosenEdition.id },
            }),
            0,
          );

          const dto = await pipe.transform(
            { mode: 'SELECTED', subscriberIds: [first.id] },
            { type: 'body', metatype: MailSendDto },
          );
          const selected = await service.enqueue(
            chosenEdition.id,
            randomUUID(),
            dto,
          );
          assert.equal(selected.total, 1);
          await service.enqueue(chosenEdition.id, randomUUID(), dto);
          const recipients = await tx.newsletterMailRecipient.findMany({
            where: { campaign: { newsletterId: chosenEdition.id } },
          });
          assert.deepEqual(
            recipients.map((item) => item.subscriberId),
            [first.id],
          );
          assert.equal(recipients[0].status, 'PENDING');

          const allEdition = await edition('all');
          const audience = await service.audience(allEdition.id);
          const all = await service.enqueue(allEdition.id, randomUUID(), {
            mode: 'ALL',
          });
          assert.equal(all.total, audience.eligible);
          const allRecipients = await tx.newsletterMailRecipient.findMany({
            where: { campaign: { newsletterId: allEdition.id } },
          });
          assert.ok(
            allRecipients.some((item) => item.subscriberId === first.id),
          );
          assert.ok(
            allRecipients.some((item) => item.subscriberId === second.id),
          );
          assert.ok(
            !allRecipients.some((item) => item.subscriberId === optOut.id),
          );
          assert.equal(smtpCalls, 0);
          throw rollback;
        },
        { timeout: 30000, isolationLevel: 'Serializable' },
      )
      .catch((error) => {
        if (error !== rollback) throw error;
      });
    assert.equal(
      await prisma.newsletter.count({
        where: { title: { startsWith: prefix } },
      }),
      0,
    );
    assert.equal(
      await prisma.newsletterSubscriber.count({
        where: { name: { startsWith: prefix } },
      }),
      0,
    );
    console.log(
      'PASS: eligible list, search/pagination, SELECTED/ALL, consent, historical deliveries, idempotency and rollback. No emails sent.',
    );
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
