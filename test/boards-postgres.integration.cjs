// Uses only an explicit test database and owns a random schema inside it.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { readdirSync, readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { Pool } = require('pg');
const { PrismaClient, BoardType } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
require('tsconfig-paths').register({
  baseUrl: resolve(__dirname, '../dist'),
  paths: { 'src/*': ['src/*'] },
});
const { BoardsRepository } = require('../dist/src/boards/boards.repository');
const { BoardsService } = require('../dist/src/boards/boards.service');

async function main() {
  const connectionString = process.env.BOARDS_TEST_DATABASE_URL;
  assert.ok(
    connectionString,
    'Provide BOARDS_TEST_DATABASE_URL for a dedicated test database.',
  );
  const schema = `boards_test_${randomUUID().replaceAll('-', '')}`;
  const admin = new Pool({ connectionString });
  const pool = new Pool({
    connectionString,
    options: `-c search_path=${schema} -c timezone=UTC`,
    max: 2,
  });
  let prisma;
  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    const migrations = resolve(__dirname, '../prisma/migrations');
    const added = '20261030120000_add_board_type';
    for (const entry of readdirSync(migrations, { withFileTypes: true })
      .filter((item) => item.isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name === added) continue;
      await pool.query(
        readFileSync(resolve(migrations, entry.name, 'migration.sql'), 'utf8'),
      );
    }
    const personId = randomUUID();
    const legacyId = randomUUID();
    await pool.query(
      'INSERT INTO "Person" (id, slug, name, category, "updatedAt") VALUES ($1, $2, $3, $4, now())',
      [personId, 'participante', 'Participante cadastrado', 'PESQUISADOR'],
    );
    await pool.query(
      'INSERT INTO "Board" (id, slug, title, "candidateId", "advisorId", date, "updatedAt") VALUES ($1, $2, $3, $4, $4, $5, now())',
      [
        legacyId,
        'defesa-antiga',
        'Defesa antiga sem tipo registrado',
        personId,
        '2026-10-30T17:35:00Z',
      ],
    );
    await pool.query(
      readFileSync(resolve(migrations, added, 'migration.sql'), 'utf8'),
    );
    prisma = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });
    const repository = new BoardsRepository(prisma);
    const service = new BoardsService(repository);
    const legacy = await service.findOneById(legacyId);
    assert.equal(legacy.type, null, 'migration must not classify by title');
    assert.equal(legacy.date.toISOString(), '2026-10-30T17:35:00.000Z');
    assert.equal(legacy.candidate.id, personId);
    assert.equal(legacy.advisor.id, personId);

    for (const type of Object.values(BoardType)) {
      const saved = await service.create({
        title: `Banca ${type}`,
        type,
        candidateId: personId,
        advisorId: personId,
        members: [personId],
        date: new Date('2026-10-30T17:35:00Z'),
        meetingUrl: 'https://example.org/banca',
      });
      assert.equal(saved.type, type);
      assert.equal((await service.findOneBySlug(saved.slug)).type, type);
      assert.equal(saved.date.toISOString(), '2026-10-30T17:35:00.000Z');
      assert.equal(saved.members[0].id, personId);
      const publicList = await service.findAll({ type });
      const page = await service.findPage({ type, page: 1, limit: 1 });
      assert.deepEqual(
        publicList.map((item) => item.id),
        [saved.id],
      );
      assert.equal(page.total, 1);
      assert.equal(page.items[0].type, type);
    }
    const classified = await service.updateBySlug(legacy.slug, {
      type: BoardType.QUALIFICATION,
    });
    assert.equal(classified.type, BoardType.QUALIFICATION);
    assert.equal(classified.date.toISOString(), legacy.date.toISOString());
    assert.equal(classified.candidateId, legacy.candidateId);
    assert.equal(classified.slug, legacy.slug);
    const edited = await service.update(legacy.id, {
      meetingUrl: 'https://example.org/novo',
    });
    assert.equal(edited.type, BoardType.QUALIFICATION);
    assert.equal(
      (await service.findPage({ type: BoardType.QUALIFICATION })).total,
      2,
    );
    const all = await service.findAll({});
    assert.equal(all.length, 3);
    console.log(
      'PASS: full migration chain, legacy preservation, creation, edit, public reads and filtered pagination with real PostgreSQL.',
    );
  } finally {
    await prisma?.$disconnect();
    await pool.end();
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
