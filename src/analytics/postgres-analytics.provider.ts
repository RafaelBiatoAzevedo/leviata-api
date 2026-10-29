import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AnalyticsEvent,
  AnalyticsProvider,
  AnalyticsRange,
  AnalyticsSnapshot,
} from './analytics.contract';
import { RETENTION_DAYS } from './analytics.contract';
import { addDays, localDay } from './analytics.dates';

class QuotaReached extends Error {}

@Injectable()
export class PostgresAnalyticsProvider implements AnalyticsProvider {
  constructor(private readonly prisma: PrismaService) {}

  async collect(event: AnalyticsEvent, monthlyLimit: number) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          await tx.$executeRaw`SET LOCAL statement_timeout = '2000ms'`;
          const inserted = await tx.$queryRaw<{ id: string }[]>`
          INSERT INTO "AnalyticsEvent" (id, day, path, source, device, browser)
          VALUES (${event.id}::uuid, ${event.day}::date, ${event.path}, ${event.source}, ${event.device}, ${event.browser})
          ON CONFLICT (id) DO NOTHING RETURNING id`;
          if (!inserted.length) return 'duplicate' as const;
          const month = event.day.slice(0, 7);
          const budget = await tx.$queryRaw<{ used: number }[]>`
          INSERT INTO "AnalyticsMonth" (month, used, capped) VALUES (${month}, 1, false)
          ON CONFLICT (month) DO UPDATE SET used = "AnalyticsMonth".used + 1,
            capped = "AnalyticsMonth".capped OR "AnalyticsMonth".used + 1 >= ${monthlyLimit}
          WHERE "AnalyticsMonth".used < ${monthlyLimit} RETURNING used`;
          if (!budget.length) throw new QuotaReached();
          return 'recorded' as const;
        },
        { maxWait: 1000, timeout: 3000 },
      );
    } catch (error) {
      if (error instanceof QuotaReached) return 'quota_reached' as const;
      throw error;
    }
  }

  async report(range: AnalyticsRange): Promise<AnalyticsSnapshot> {
    const retainedFrom = addDays(localDay(), 1 - RETENTION_DAYS);
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SET LOCAL statement_timeout = '3000ms'`;
        const rows = await tx.$queryRaw<AnalyticsSnapshot['rows']>`
        WITH current_events AS MATERIALIZED (
          SELECT day, path, source, device, browser FROM "AnalyticsEvent"
          WHERE day BETWEEN ${range.from}::date AND ${range.to}::date
        )
        SELECT CASE WHEN GROUPING(day) = 0 THEN 'day'
          WHEN GROUPING(path) = 0 THEN 'page' WHEN GROUPING(source) = 0 THEN 'source'
          WHEN GROUPING(device) = 0 THEN 'device' ELSE 'browser' END AS dimension,
          COALESCE(day::text, path, source, device, browser) AS key, COUNT(*)::int AS views
        FROM current_events GROUP BY GROUPING SETS ((day), (path), (source), (device), (browser))
        UNION ALL
        SELECT 'previousDay', day::text, COUNT(*)::int FROM "AnalyticsEvent"
        WHERE day BETWEEN ${range.previousFrom}::date AND ${range.previousTo}::date
          AND day >= ${retainedFrom}::date GROUP BY day`;
        const months = await tx.$queryRaw<AnalyticsSnapshot['months']>`
        SELECT month, used, capped FROM "AnalyticsMonth"
        WHERE month >= ${range.previousFrom.slice(0, 7)} ORDER BY month`;
        const first = await tx.$queryRaw<{ day: string | null }[]>`
        SELECT (SELECT day::text FROM "AnalyticsEvent" WHERE day >= ${retainedFrom}::date ORDER BY day ASC LIMIT 1) AS day`;
        return { rows, months, earliest: first[0]?.day ?? null };
      },
      { maxWait: 1000, timeout: 5000, isolationLevel: 'RepeatableRead' },
    );
  }

  async cleanup(before: string) {
    await this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SET LOCAL statement_timeout = '2000ms'`;
        await tx.$executeRaw`DELETE FROM "AnalyticsEvent" WHERE id IN (
        SELECT id FROM "AnalyticsEvent" WHERE day < ${before}::date ORDER BY day LIMIT 5000)`;
        await tx.$executeRaw`DELETE FROM "AnalyticsMonth" WHERE month < ${before.slice(0, 7)}`;
      },
      { maxWait: 1000, timeout: 3000 },
    );
  }
}
