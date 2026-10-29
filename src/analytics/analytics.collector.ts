import {
  ForbiddenException,
  HttpException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { createHmac, randomBytes } from 'node:crypto';
import type { Request } from 'express';
import { AnalyticsConfig } from './analytics.config';
import { ANALYTICS_PROVIDER, RETENTION_DAYS } from './analytics.contract';
import type { AnalyticsProvider } from './analytics.contract';
import { addDays, localDay } from './analytics.dates';
import { CollectAnalyticsDto } from './analytics.dto';

export function clientDimensions(ua: string) {
  const device = /ipad|tablet|android(?!.*mobile)/i.test(ua)
    ? 'Tablet'
    : /mobile|iphone|ipod/i.test(ua)
      ? 'Celular'
      : 'Computador';
  const browser = /edg\//i.test(ua)
    ? 'Edge'
    : /opr\//i.test(ua)
      ? 'Opera'
      : /firefox|fxios/i.test(ua)
        ? 'Firefox'
        : /chrome|crios/i.test(ua)
          ? 'Chrome'
          : /safari/i.test(ua)
            ? 'Safari'
            : 'Outros';
  return { device, browser };
}

@Injectable()
export class AnalyticsCollector {
  private readonly logger = new Logger(AnalyticsCollector.name);
  private readonly salt = randomBytes(32);
  private readonly rates = new Map<
    string,
    { count: number; expires: number }
  >();
  private window = { count: 0, expires: 0 };
  private busy = 0;
  private nextCleanup = 0;
  private lastWarning = 0;
  private blockedUntil = 0;

  constructor(
    private readonly config: AnalyticsConfig,
    @Inject(ANALYTICS_PROVIDER) private readonly provider: AnalyticsProvider,
  ) {}

  async collect(dto: CollectAnalyticsDto, req: Request): Promise<void> {
    const settings = this.config.settings();
    if (!settings.ready) return;
    const origin = req.get('origin');
    if (!origin || !settings.origins.includes(origin))
      throw new ForbiddenException('Origem não autorizada.');
    if (
      req.get('dnt') === '1' ||
      req.get('sec-gpc') === '1' ||
      req.get('authorization')
    )
      return;
    const ua = req.get('user-agent')?.slice(0, 1000) ?? '';
    if (
      !ua ||
      /bot|crawl|spider|headless|preview|lighthouse|curl|wget|monitor|slurp|facebookexternalhit/i.test(
        ua,
      )
    )
      return;
    const now = Date.now();
    if (now < this.blockedUntil)
      throw new HttpException('Coleta temporariamente indisponível.', 503);
    this.limit(req, settings.proxyHops, now);
    if (this.busy >= 4)
      throw new HttpException('Limite temporário de coleta.', 429);
    this.busy++;
    try {
      const day = localDay();
      // Cleanup runs in bounded batches during traffic; never wakes an idle DB.
      if (now >= this.nextCleanup) {
        this.nextCleanup = now + 60000;
        await this.provider.cleanup(addDays(day, 1 - RETENTION_DAYS));
      }
      const result = await this.provider.collect(
        { ...dto, day, ...clientDimensions(ua) },
        settings.monthlyLimit,
      );
      if (result === 'quota_reached') {
        this.blockedUntil = now + 60000;
        throw new HttpException('Cota de coleta atingida.', 429);
      }
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.blockedUntil = now + 15000;
      if (now - this.lastWarning > 60000) {
        this.logger.warn(
          'Coleta de analytics indisponível; nenhuma informação do visitante foi registrada no log.',
        );
        this.lastWarning = now;
      }
      throw new HttpException('Coleta temporariamente indisponível.', 503);
    } finally {
      this.busy--;
    }
  }

  private limit(req: Request, proxyHops: number, now: number) {
    // Never trust arbitrary forwarded headers by default. No global trust-proxy change.
    const chain = (req.get('x-forwarded-for') ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const address =
      proxyHops > 0 && chain.length >= proxyHops
        ? chain[chain.length - proxyHops]
        : (req.socket.remoteAddress ?? 'unknown');
    const key = createHmac('sha256', this.salt).update(address).digest('hex');
    if (now >= this.window.expires) {
      this.window = { count: 0, expires: now + 60000 };
      for (const [id, rate] of this.rates)
        if (rate.expires <= now) this.rates.delete(id);
    }
    let rate = this.rates.get(key);
    if (!rate || rate.expires <= now) {
      if (this.rates.size >= 10000)
        throw new HttpException('Limite temporário de coleta.', 429);
      rate = { count: 0, expires: now + 60000 };
      this.rates.set(key, rate);
    }
    if (++rate.count > 120 || ++this.window.count > 600)
      throw new HttpException('Limite temporário de coleta.', 429);
  }
}
