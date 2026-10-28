// Real PostgreSQL regression. All test records are rolled back, including on assertion failure.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
require('dotenv').config({ quiet: true });
const { PrismaService } = require('../dist/src/prisma/prisma.service.js');
const {
  ScheduleRepository,
} = require('../dist/src/schedule/schedule.repository.js');
const { ScheduleService } = require('../dist/src/schedule/schedule.service.js');
const {
  MeetingsRepository,
} = require('../dist/src/meetings/meetings.repository.js');
const { findCommentTarget } = require('../dist/src/comments/comment-target.js');

async function main() {
  const prisma = new PrismaService();
  const prefix = `integration-events-${randomUUID()}`;
  const rollback = new Error('Expected test rollback');
  try {
    await prisma.$connect();
    await prisma
      .$transaction(
        async (tx) => {
          const common = {
            type: 'SYMPOSIUM',
            date: new Date('2026-10-15T00:00:00Z'),
          };
          const internal = await tx.meeting.create({
            data: {
              ...common,
              title: `${prefix} interno`,
              slug: `${prefix}-interno`,
            },
          });
          const external = await tx.meeting.create({
            data: {
              ...common,
              title: `${prefix} externo`,
              slug: `${prefix}-externo`,
              isInternal: false,
            },
          });
          assert.equal(internal.isInternal, true);
          const meetings = new MeetingsRepository(tx);
          const list = await meetings.findAll({
            type: 'SYMPOSIUM',
            isInternal: true,
            search: prefix,
          });
          assert.deepEqual(
            list.map((item) => item.id),
            [internal.id],
          );
          assert.equal(
            (await meetings.findBySlug(external.slug)).id,
            external.id,
          );
          assert.equal(
            (await findCommentTarget(tx, 'MEETING', external.id)).path,
            `/atividades/simposios/${external.slug}`,
          );

          const service = new ScheduleService(new ScheduleRepository(tx));
          const agenda = await service.create({
            title: prefix,
            date: '2026-10-15T12:00:00Z',
            location: 'Auditório',
            externalUrl: 'https://example.com/inscricao',
          });
          assert.equal(agenda.meeting, null);
          assert.equal(agenda.meetingId, null);
          const linked = await service.updateBySlug(agenda.slug, {
            meetingId: external.id,
          });
          assert.equal(linked.externalUrl, null);
          assert.equal(linked.location, agenda.location);
          assert.equal(linked.date.toISOString(), agenda.date.toISOString());
          assert.equal(linked.meeting.isInternal, false);
          assert.equal(linked.meeting.type, 'SYMPOSIUM');
          const page = await service.findPage({ search: prefix });
          assert.equal(page.total, 1);
          assert.equal(page.items[0].meeting.id, external.id);
          assert.deepEqual(Object.keys(page.items[0].meeting).sort(), [
            'id',
            'isInternal',
            'slug',
            'title',
            'type',
          ]);

          await tx.meeting.update({
            where: { id: external.id },
            data: { slug: `${prefix}-renamed` },
          });
          assert.equal(
            (await service.findOneById(agenda.id)).meeting.slug,
            `${prefix}-renamed`,
          );
          const unlinked = await service.update(agenda.id, {
            externalUrl: 'https://example.com/novo',
          });
          assert.equal(unlinked.meetingId, null);
          assert.equal(unlinked.meeting, null);
          await assert.rejects(
            service.update(agenda.id, {
              meetingId: internal.id,
              externalUrl: 'https://example.com',
            }),
            /Escolha um evento/,
          );
          await assert.rejects(
            service.update(agenda.id, { meetingId: randomUUID() }),
            /não existe ou foi excluído/,
          );
          await service.update(agenda.id, { meetingId: external.id });
          await tx.meeting.update({
            where: { id: external.id },
            data: { deletedAt: new Date() },
          });
          assert.equal(
            (await service.findAll({ search: prefix }))[0].meeting,
            null,
          );
          await assert.rejects(
            service.update(agenda.id, { meetingId: external.id }),
            /não existe ou foi excluído/,
          );
          await tx.meeting.delete({ where: { id: external.id } });
          assert.equal((await service.findOneById(agenda.id)).meetingId, null);
          throw rollback;
        },
        { timeout: 15000 },
      )
      .catch((error) => {
        if (error !== rollback) throw error;
      });
    assert.equal(
      await prisma.meeting.count({ where: { slug: { startsWith: prefix } } }),
      0,
    );
    assert.equal(await prisma.schedule.count({ where: { title: prefix } }), 0);
    console.log(
      'PASS: SYMPOSIUM, visibility, agenda destination replacement, current slugs, deletion and rollback.',
    );
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
