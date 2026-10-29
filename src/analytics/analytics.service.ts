import { Inject, Injectable, Logger } from '@nestjs/common';
import { AnalyticsConfig } from './analytics.config';
import {
  ANALYTICS_PROVIDER,
  AnalyticsData,
  AnalyticsRange,
  AnalyticsReport,
  AnalyticsRow,
  CACHE_SECONDS,
  PAGE_LABELS,
  RETENTION_DAYS,
  SOURCES,
  TIMEZONE,
} from './analytics.contract';
import type { AnalyticsProvider } from './analytics.contract';
import { addDays, analyticsRange, localDay } from './analytics.dates';
import { AnalyticsQueryDto } from './analytics.dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly cache = new Map<
    string,
    { expires: number; report: AnalyticsReport }
  >();
  private readonly pending = new Map<string, Promise<AnalyticsReport>>();
  private lastWarning = 0;

  constructor(
    private readonly config: AnalyticsConfig,
    @Inject(ANALYTICS_PROVIDER) private readonly provider: AnalyticsProvider,
  ) {}

  report(query: AnalyticsQueryDto): Promise<AnalyticsReport> {
    const range = analyticsRange(query.from, query.to);
    const settings = this.config.settings();
    const base: AnalyticsReport = {
      status: 'not_configured',
      provider: 'first-party',
      timezone: TIMEZONE,
      range,
      generatedAt: new Date().toISOString(),
      cacheSeconds: CACHE_SECONDS,
      retentionDays: RETENTION_DAYS,
      earliestAvailableDate: null,
      missing: settings.missing,
      quota: null,
      limitedMonths: [],
      data: null,
    };
    if (!settings.ready) return Promise.resolve(base);
    const key = `${range.from}:${range.to}`;
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now())
      return Promise.resolve(cached.report);
    const pending = this.pending.get(key);
    if (pending) return pending;
    // Bound both cache cardinality and concurrent expensive reads.
    if (this.pending.size >= 4)
      return Promise.resolve({ ...base, status: 'unavailable' });
    const request = this.load(base, range, settings.monthlyLimit).finally(() =>
      this.pending.delete(key),
    );
    this.pending.set(key, request);
    return request;
  }

  private async load(
    base: AnalyticsReport,
    range: AnalyticsRange,
    limit: number,
  ): Promise<AnalyticsReport> {
    let result: AnalyticsReport;
    try {
      const snapshot = await this.provider.report(range);
      const month = localDay().slice(0, 7);
      const used =
        snapshot.months.find((item) => item.month === month)?.used ?? 0;
      const limitedMonths = snapshot.months
        .filter((item) => item.capped || item.used >= limit)
        .map((item) => item.month);
      const data = this.aggregate(snapshot.rows, range);
      data.comparisonReliable =
        !!snapshot.earliest &&
        snapshot.earliest < range.previousFrom &&
        range.previousFrom >= addDays(localDay(), 1 - RETENTION_DAYS) &&
        range.to < localDay() &&
        !limitedMonths.some(
          (item) =>
            item >= range.previousFrom.slice(0, 7) &&
            item <= range.to.slice(0, 7),
        );
      // A percentage is only meaningful with complete periods and a nonzero base.
      data.changePercent =
        data.comparisonReliable && data.previousPageviews > 0
          ? ((data.pageviews - data.previousPageviews) /
              data.previousPageviews) *
            100
          : null;
      result = {
        ...base,
        status: used >= limit ? 'quota_reached' : 'ready',
        missing: [],
        earliestAvailableDate: snapshot.earliest,
        quota: { month, used, limit },
        limitedMonths,
        data,
      };
    } catch {
      if (Date.now() - this.lastWarning > 60000) {
        this.logger.warn(
          'Analytics indisponível; confira a migration e a conexão. Detalhes de requisição omitidos.',
        );
        this.lastWarning = Date.now();
      }
      result = { ...base, status: 'unavailable', missing: [] };
    }
    if (this.cache.size >= 32) this.cache.delete([...this.cache.keys()][0]);
    this.cache.set(`${range.from}:${range.to}`, {
      expires:
        Date.now() +
        (result.status === 'unavailable' ? 15000 : CACHE_SECONDS * 1000),
      report: result,
    });
    return result;
  }

  private aggregate(
    rows: { dimension: string; key: string; views: number }[],
    range: AnalyticsRange,
  ): AnalyticsData {
    const byDimension = (
      dimension: string,
      label: (key: string) => string = (key) => key,
    ): AnalyticsRow[] =>
      rows
        .filter((row) => row.dimension === dimension)
        .map((row) => ({
          key: row.key,
          label: label(row.key),
          views: Number(row.views),
        }))
        .sort((a, b) => b.views - a.views || a.key.localeCompare(b.key));
    const days = new Map(byDimension('day').map((row) => [row.key, row.views]));
    const previous = new Map(
      byDimension('previousDay').map((row) => [row.key, row.views]),
    );
    const series = Array.from({ length: range.days }, (_, index) => ({
      date: addDays(range.from, index),
      views: days.get(addDays(range.from, index)) ?? 0,
      previousViews: previous.get(addDays(range.previousFrom, index)) ?? 0,
    }));
    const pages = byDimension(
      'page',
      (key) => PAGE_LABELS[key]?.[0] ?? 'Página pública',
    );
    const sections = new Map<string, number>();
    for (const page of pages) {
      const section = PAGE_LABELS[page.key]?.[1] ?? 'Outras';
      sections.set(section, (sections.get(section) ?? 0) + page.views);
    }
    const pageviews = series.reduce((sum, row) => sum + row.views, 0);
    return {
      pageviews,
      previousPageviews: series.reduce(
        (sum, row) => sum + row.previousViews,
        0,
      ),
      changePercent: null,
      comparisonReliable: false,
      averagePerDay: pageviews / range.days,
      activeDays: series.filter((row) => row.views > 0).length,
      sessions: null,
      uniqueVisitors: null,
      pagesPerSession: null,
      series,
      pages,
      sections: [...sections]
        .map(([key, views]) => ({ key, label: key, views }))
        .sort((a, b) => b.views - a.views),
      sources: byDimension(
        'source',
        (key) => (SOURCES as Record<string, string>)[key] ?? 'Outros sites',
      ),
      devices: byDimension('device'),
      browsers: byDimension('browser'),
    };
  }
}
