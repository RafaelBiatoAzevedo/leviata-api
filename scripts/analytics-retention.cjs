// Maintenance for Analytics tables only. No CMS or account data is touched.
require('dotenv/config');
const { Pool } = require('pg');

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('missing_database');
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const cutoff = new Date(`${today}T12:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - 179);
  const before = cutoff.toISOString().slice(0, 10);
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 3000,
    options: '-c statement_timeout=3000 -c lock_timeout=1000 -c timezone=UTC',
  });
  let deleted = 0;
  try {
    for (let batch = 0; batch < 20; batch++) {
      const result = await pool.query(
        'DELETE FROM "AnalyticsEvent" WHERE id IN (SELECT id FROM "AnalyticsEvent" WHERE day < $1::date ORDER BY day LIMIT 5000)',
        [before],
      );
      deleted += result.rowCount;
      if (result.rowCount < 5000) break;
    }
    await pool.query('DELETE FROM "AnalyticsMonth" WHERE month < $1', [
      before.slice(0, 7),
    ]);
    console.log(
      `Analytics: ${deleted} registros anteriores a ${before} excluídos. Limite por execução: 100 mil registros.`,
    );
  } finally {
    await pool.end();
  }
}
main().catch(() => {
  console.error(
    'Falha na manutenção de analytics. Confira a conexão e a migration; detalhes de acesso omitidos.',
  );
  process.exitCode = 1;
});
