import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AnalyticsConfig {
  constructor(private readonly config: ConfigService) {}

  settings() {
    const value = (key: string, fallback = '') =>
      this.config.get<string>(key)?.trim() || fallback;
    const missing: string[] = [];
    const enabledRaw = value('ANALYTICS_ENABLED', 'false');
    if (!['true', 'false'].includes(enabledRaw))
      missing.push('ANALYTICS_ENABLED');
    const origins = value('ANALYTICS_ALLOWED_ORIGINS')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (
      !origins.length ||
      origins.some((origin) => {
        try {
          const url = new URL(origin);
          return (
            url.origin !== origin ||
            !['http:', 'https:'].includes(url.protocol) ||
            (value('NODE_ENV') === 'production' && url.protocol !== 'https:')
          );
        } catch {
          return true;
        }
      })
    )
      missing.push('ANALYTICS_ALLOWED_ORIGINS');
    const monthlyLimit = Number(value('ANALYTICS_MONTHLY_LIMIT', '10000'));
    if (
      !Number.isInteger(monthlyLimit) ||
      monthlyLimit < 100 ||
      monthlyLimit > 100000
    )
      missing.push('ANALYTICS_MONTHLY_LIMIT');
    const proxyHops = Number(value('ANALYTICS_TRUST_PROXY_HOPS', '0'));
    if (!Number.isInteger(proxyHops) || proxyHops < 0 || proxyHops > 2)
      missing.push('ANALYTICS_TRUST_PROXY_HOPS');
    if (enabledRaw !== 'true') missing.unshift('ANALYTICS_ENABLED');
    return {
      ready: enabledRaw === 'true' && !missing.length,
      origins,
      monthlyLimit,
      proxyHops,
      missing: [...new Set(missing)],
    };
  }
}
