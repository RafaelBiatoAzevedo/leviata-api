// Isolated integration test: NEVER falls back to the application's DATABASE_URL.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { randomUUID } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const {
  PostgresAnalyticsProvider,
} = require('../dist/src/analytics/postgres-analytics.provider');
const {
  addDays,
  localDay,
  analyticsRange,
} = require('../dist/src/analytics/analytics.dates');

async function main() {
  const connectionString = process.env.ANALYTICS_TEST_DATABASE_URL;
  assert.ok(
    connectionString,
    'Provide ANALYTICS_TEST_DATABASE_URL for a disposable PostgreSQL database.',
  );
  const schema = `analytics_test_${randomUUID().replaceAll('-', '')}`;
  const admin = new Pool({ connectionString });
  let prisma;
  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    const pool = new Pool({
      connectionString,
      options: `-c search_path=${schema} -c timezone=UTC`,
      max: 12,
    });
    prisma = new PrismaClient({
      adapter: new PrismaPg(pool, { disposeExternalPool: true }),
    });
    await pool.query(
      readFileSync(
        resolve(
          __dirname,
          '../prisma/migrations/20261028220000_add_anonymous_analytics/migration.sql',
        ),
        'utf8',
      ),
    );
    const storage = new PostgresAnalyticsProvider(prisma);
    const day = localDay();
    const event = {
      id: randomUUID(),
      day,
      path: '/noticias/:id',
      source: 'google',
      device: 'Celular',
      browser: 'Chrome',
    };
    assert.equal(await storage.collect(event, 5), 'recorded');
    assert.equal(await storage.collect(event, 5), 'duplicate');
    const duplicates = await Promise.all(
      Array.from({ length: 8 }, () => storage.collect(event, 5)),
    );
    assert.ok(duplicates.every((result) => result === 'duplicate'));
    const race = await Promise.all(
      Array.from({ length: 20 }, () =>
        storage.collect({ ...event, id: randomUUID() }, 5),
      ),
    );
    assert.equal(race.filter((result) => result === 'recorded').length, 4);
    assert.equal(
      race.filter((result) => result === 'quota_reached').length,
      16,
    );
    const rows = await pool.query(
      'SELECT count(*)::int AS count FROM "AnalyticsEvent"',
    );
    assert.equal(rows.rows[0].count, 5, 'over-quota inserts must roll back');
    const month = await pool.query('SELECT used, capped FROM "AnalyticsMonth"');
    assert.deepEqual(month.rows, [{ used: 5, capped: true }]);
    const report = await storage.report(analyticsRange(day, day));
    for (const dimension of ['day', 'page', 'source', 'device', 'browser']) {
      assert.equal(
        report.rows
          .filter((row) => row.dimension === dimension)
          .reduce((sum, row) => sum + row.views, 0),
        5,
        dimension,
      );
    }
    assert.equal(report.earliest, day);
    const expired = { ...event, id: randomUUID(), day: addDays(day, -181) };
    await storage.collect(expired, 100);
    assert.equal(
      (await storage.report(analyticsRange(day, day))).earliest,
      day,
      'expired data is invisible even before cleanup',
    );
    const maintenanceUrl = new URL(connectionString);
    maintenanceUrl.searchParams.set(
      'options',
      `-c search_path=${schema} -c statement_timeout=3000 -c lock_timeout=1000 -c timezone=UTC`,
    );
    const maintenance = execFileSync(
      process.execPath,
      [resolve(__dirname, '../scripts/analytics-retention.cjs')],
      {
        env: { ...process.env, DATABASE_URL: maintenanceUrl.toString() },
        encoding: 'utf8',
      },
    );
    assert.match(maintenance, /Analytics: 1 registros/);
    await storage.collect({ ...expired, id: randomUUID() }, 100);
    await storage.cleanup(addDays(day, -179));
    const retained = await pool.query(
      'SELECT count(*)::int AS count FROM "AnalyticsEvent"',
    );
    assert.equal(retained.rows[0].count, 5);
    const columns = await pool.query(
      'SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 ORDER BY column_name',
      [schema, 'AnalyticsEvent'],
    );
    assert.deepEqual(
      columns.rows.map((row) => row.column_name),
      ['browser', 'day', 'device', 'id', 'path', 'source'],
    );
    console.log(
      'PASS: additive migration, real SQL aggregations, concurrent deduplication, atomic quota/rollback, retention and privacy schema.',
    );
  } finally {
    await prisma?.$disconnect();
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.end();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
