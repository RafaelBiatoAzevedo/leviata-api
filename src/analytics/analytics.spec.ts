/* eslint-disable @typescript-eslint/unbound-method -- Assertions inspect Jest mocks without invoking detached methods. */
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { AnalyticsConfig } from './analytics.config';
import { AnalyticsCollector, clientDimensions } from './analytics.collector';
import { AnalyticsService } from './analytics.service';
import { addDays, analyticsRange, localDay } from './analytics.dates';
import type {
  AnalyticsProvider,
  AnalyticsSnapshot,
} from './analytics.contract';
import { CollectAnalyticsDto } from './analytics.dto';
import { validateSync } from 'class-validator';

function config(overrides: Record<string, string> = {}) {
  return new AnalyticsConfig(
    new ConfigService({
      ANALYTICS_ENABLED: 'true',
      ANALYTICS_ALLOWED_ORIGINS: 'https://portal.test',
      ...overrides,
    }),
  );
}
function provider(): jest.Mocked<AnalyticsProvider> {
  return {
    report: jest.fn(),
    collect: jest.fn().mockResolvedValue('recorded'),
    cleanup: jest.fn().mockResolvedValue(undefined),
  };
}
function request(
  headers: Record<string, string> = {},
  address = '127.0.0.1',
): Request {
  const values: Record<string, string> = {
    origin: 'https://portal.test',
    'user-agent': 'Mozilla/5.0 Chrome/120 Safari/537',
    ...headers,
  };
  return {
    get: (key: string) => values[key],
    socket: { remoteAddress: address },
  } as unknown as Request;
}
const event = {
  id: 'd41c2d54-c0f8-4a7a-87ce-e657e5a44cb9',
  path: '/noticias/:id',
  source: 'google',
};

describe('Analytics privacy and filters', () => {
  it('uses São Paulo day boundaries and validates inclusive dates', () => {
    expect(localDay(new Date('2026-10-29T01:59:00Z'))).toBe('2026-10-28');
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29');
    const now = new Date('2026-10-28T12:00:00Z');
    expect(analyticsRange('2026-07-31', '2026-10-28', now)).toEqual({
      from: '2026-07-31',
      to: '2026-10-28',
      previousFrom: '2026-05-02',
      previousTo: '2026-07-30',
      days: 90,
    });
    for (const [from, to] of [
      ['2026-02-30', '2026-03-01'],
      ['2026-07-30', '2026-10-28'],
      ['2026-10-29', '2026-10-29'],
      ['2026-10-28', '2026-10-27'],
      ['2026-01-01', '2026-01-02'],
    ])
      expect(() => analyticsRange(from, to, now)).toThrow();
  });
  it('validates optional configuration without breaking the rest of the app', () => {
    expect(config({ ANALYTICS_ENABLED: 'false' }).settings().ready).toBe(false);
    for (const overrides of [
      { ANALYTICS_ALLOWED_ORIGINS: '*' },
      { ANALYTICS_ALLOWED_ORIGINS: 'https://portal.test/path' },
      { ANALYTICS_MONTHLY_LIMIT: '0' },
      { ANALYTICS_MONTHLY_LIMIT: '100001' },
      { ANALYTICS_TRUST_PROXY_HOPS: '3' },
      {
        NODE_ENV: 'production',
        ANALYTICS_ALLOWED_ORIGINS: 'http://portal.test',
      },
    ])
      expect(config(overrides).settings().ready).toBe(false);
    expect(config().settings().ready).toBe(true);
  });
  it('rejects PII-bearing paths, unexpected sources and non-v4 event IDs', () => {
    expect(
      validateSync(Object.assign(new CollectAnalyticsDto(), event)),
    ).toHaveLength(0);
    for (const overrides of [
      { path: '/admin' },
      { path: '/noticias/nome-pessoal' },
      { path: '/?email=private' },
      { source: 'https://nome.example' },
      { id: 'visitor-123' },
    ])
      expect(
        validateSync(Object.assign(new CollectAnalyticsDto(), event, overrides))
          .length,
      ).toBeGreaterThan(0);
  });
  it('classifies browser families without versions or raw user agents', () => {
    expect(clientDimensions('Mozilla iPhone Mobile Safari/1')).toEqual({
      device: 'Celular',
      browser: 'Safari',
    });
    expect(clientDimensions('Android Tablet Chrome/1 Edg/2')).toEqual({
      device: 'Tablet',
      browser: 'Edge',
    });
  });
});

describe('Analytics collector', () => {
  it('does not touch storage when disabled, opted out, authenticated or a bot', async () => {
    const storage = provider();
    await new AnalyticsCollector(
      config({ ANALYTICS_ENABLED: 'false' }),
      storage,
    ).collect(event, request());
    const collector = new AnalyticsCollector(config(), storage);
    for (const headers of [
      { dnt: '1' },
      { 'sec-gpc': '1' },
      { authorization: 'Bearer test-only' },
      { 'user-agent': 'Googlebot' },
      { 'user-agent': 'HeadlessChrome' },
    ])
      await collector.collect(event, request(headers));
    expect(storage.collect).not.toHaveBeenCalled();
    expect(storage.cleanup).not.toHaveBeenCalled();
  });
  it('requires an exact allowed origin', async () => {
    const storage = provider();
    const collector = new AnalyticsCollector(config(), storage);
    for (const origin of [
      '',
      'https://portal.test.evil.test',
      'http://portal.test',
    ])
      await expect(
        collector.collect(event, request({ origin })),
      ).rejects.toMatchObject({ status: 403 });
    expect(storage.collect).not.toHaveBeenCalled();
  });
  it('stores only closed dimensions and a per-pageview ID', async () => {
    const storage = provider();
    const collector = new AnalyticsCollector(config(), storage);
    await collector.collect(event, request());
    const stored = storage.collect.mock.calls[0][0];
    expect(Object.keys(stored).sort()).toEqual([
      'browser',
      'day',
      'device',
      'id',
      'path',
      'source',
    ]);
    expect(stored.day).toBe(localDay());
    expect(JSON.stringify(stored)).not.toMatch(/127\.0\.0\.1|Mozilla|120/);
  });
  it('rate limits before storage and ignores spoofed forwarded headers by default', async () => {
    const storage = provider();
    const collector = new AnalyticsCollector(config(), storage);
    for (let index = 0; index < 120; index++)
      await collector.collect(
        event,
        request({ 'x-forwarded-for': `10.0.0.${index}` }),
      );
    await expect(
      collector.collect(
        event,
        request({ 'x-forwarded-for': 'new-spoofed-address' }),
      ),
    ).rejects.toMatchObject({ status: 429 });
    expect(storage.collect).toHaveBeenCalledTimes(120);
    expect(storage.cleanup).toHaveBeenCalledTimes(1);
  });
  it('backs off after a quota or provider failure', async () => {
    const storage = provider();
    storage.collect.mockResolvedValue('quota_reached');
    const collector = new AnalyticsCollector(config(), storage);
    await expect(collector.collect(event, request())).rejects.toMatchObject({
      status: 429,
    });
    await expect(collector.collect(event, request())).rejects.toMatchObject({
      status: 503,
    });
    expect(storage.collect).toHaveBeenCalledTimes(1);
  });
});

describe('Analytics reports', () => {
  const snapshot: AnalyticsSnapshot = {
    earliest: '2026-09-01',
    months: [{ month: '2026-10', used: 12, capped: false }],
    rows: [
      { dimension: 'day', key: '2026-10-20', views: 4 },
      { dimension: 'day', key: '2026-10-21', views: 8 },
      { dimension: 'previousDay', key: '2026-10-18', views: 2 },
      { dimension: 'previousDay', key: '2026-10-19', views: 4 },
      { dimension: 'page', key: '/noticias/:id', views: 12 },
      { dimension: 'source', key: 'google', views: 12 },
    ],
  };
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-28T12:00:00Z'));
  });
  afterEach(() => jest.useRealTimers());

  it('returns honest configuration and unavailable states without fake zeros', async () => {
    const storage = provider();
    const disabled = await new AnalyticsService(
      config({ ANALYTICS_ENABLED: 'false' }),
      storage,
    ).report({});
    expect(disabled).toMatchObject({ status: 'not_configured', data: null });
    expect(storage.report).not.toHaveBeenCalled();
    storage.report.mockRejectedValue(new Error('secret-connection-string'));
    const unavailable = await new AnalyticsService(config(), storage).report(
      {},
    );
    expect(unavailable).toMatchObject({ status: 'unavailable', data: null });
    expect(JSON.stringify(unavailable)).not.toContain(
      'secret-connection-string',
    );
  });
  it('fills missing days, derives sections and only compares full periods', async () => {
    const storage = provider();
    storage.report.mockResolvedValue(snapshot);
    const report = await new AnalyticsService(config(), storage).report({
      from: '2026-10-20',
      to: '2026-10-21',
    });
    expect(report.data).toMatchObject({
      pageviews: 12,
      previousPageviews: 6,
      changePercent: 100,
      comparisonReliable: true,
      averagePerDay: 6,
      sessions: null,
      uniqueVisitors: null,
      pagesPerSession: null,
    });
    expect(report.data?.sections).toEqual([
      { key: 'Notícias', label: 'Notícias', views: 12 },
    ]);
    expect(report.data?.sources[0].label).toBe('Google');
    const partial = await new AnalyticsService(config(), storage).report({
      from: '2026-10-20',
      to: '2026-10-28',
    });
    expect(partial.data?.series).toHaveLength(9);
    expect(partial.data?.series[8].views).toBe(0);
    expect(partial.data?.changePercent).toBeNull();
  });
  it('never divides by zero or compares before collection or after a cap', async () => {
    const storage = provider();
    for (const value of [
      { ...snapshot, earliest: '2026-10-20' },
      {
        ...snapshot,
        months: [{ month: '2026-10', used: 10000, capped: true }],
      },
      { ...snapshot, rows: [] },
    ]) {
      storage.report.mockResolvedValue(value);
      const report = await new AnalyticsService(config(), storage).report({
        from: '2026-10-20',
        to: '2026-10-21',
      });
      expect(report.data?.changePercent).toBeNull();
      expect(JSON.stringify(report)).not.toMatch(/NaN|Infinity/);
      if (value.months[0].capped) expect(report.status).toBe('quota_reached');
    }
  });
  it('coalesces simultaneous reads and expires the five-minute cache', async () => {
    const storage = provider();
    storage.report.mockResolvedValue(snapshot);
    const service = new AnalyticsService(config(), storage);
    await Promise.all([
      service.report({}),
      service.report({}),
      service.report({}),
    ]);
    await service.report({});
    expect(storage.report).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(300001);
    await service.report({});
    expect(storage.report).toHaveBeenCalledTimes(2);
  });
});
