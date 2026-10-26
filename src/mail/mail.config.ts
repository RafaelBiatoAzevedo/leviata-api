import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isEmail } from 'class-validator';

export const MAIL_FROM = 'leviataeocativeiro@gmail.com';

@Injectable()
export class MailConfig {
  constructor(private readonly config: ConfigService) {}

  settings() {
    const missing: string[] = [];
    const value = (key: string, fallback = '') =>
      this.config.get<string>(key)?.trim() || fallback;
    const number = (
      key: string,
      fallback: number,
      min: number,
      max: number,
    ) => {
      const result = Number(value(key, String(fallback)));
      if (!Number.isInteger(result) || result < min || result > max)
        missing.push(key);
      return result;
    };
    const boolean = (key: string, fallback: boolean) => {
      const result = value(key, String(fallback));
      if (!['true', 'false'].includes(result)) missing.push(key);
      return result === 'true';
    };
    const baseUrl = (key: string, fallback: string) => {
      const raw = value(key, fallback);
      try {
        const parsed = new URL(raw);
        if (
          !['http:', 'https:'].includes(parsed.protocol) ||
          parsed.username ||
          parsed.password ||
          parsed.search ||
          parsed.hash ||
          (value('NODE_ENV') === 'production' && parsed.protocol !== 'https:')
        )
          throw new Error();
        return raw.replace(/\/+$/, '');
      } catch {
        missing.push(key);
        return '';
      }
    };
    const enabled = boolean('MAIL_ENABLED', false);
    const workerEnabled = boolean('MAIL_WORKER_ENABLED', true);
    const authMode = value('MAIL_AUTH_MODE', 'oauth2');
    if (!['oauth2', 'app-password'].includes(authMode))
      missing.push('MAIL_AUTH_MODE');
    const user = value('MAIL_SMTP_USER', MAIL_FROM);
    const from = value('MAIL_FROM_EMAIL', MAIL_FROM);
    const replyTo = value('MAIL_REPLY_TO', from);
    for (const [key, address] of [
      ['MAIL_SMTP_USER', user],
      ['MAIL_FROM_EMAIL', from],
      ['MAIL_REPLY_TO', replyTo],
    ])
      if (!isEmail(address)) missing.push(key);
    const appPassword = value('MAIL_GMAIL_APP_PASSWORD').replace(/\s/g, '');
    const clientId = value('MAIL_GOOGLE_CLIENT_ID');
    const clientSecret = value('MAIL_GOOGLE_CLIENT_SECRET');
    const refreshToken = value('MAIL_GOOGLE_REFRESH_TOKEN');
    if (authMode === 'app-password' && !appPassword)
      missing.push('MAIL_GMAIL_APP_PASSWORD');
    if (authMode === 'oauth2') {
      if (!clientId) missing.push('MAIL_GOOGLE_CLIENT_ID');
      if (!clientSecret) missing.push('MAIL_GOOGLE_CLIENT_SECRET');
      if (!refreshToken) missing.push('MAIL_GOOGLE_REFRESH_TOKEN');
    }
    const unsubscribeSecret = value('MAIL_UNSUBSCRIBE_SECRET');
    if (Buffer.byteLength(unsubscribeSecret) < 32)
      missing.push('MAIL_UNSUBSCRIBE_SECRET');
    const port = number('MAIL_SMTP_PORT', 465, 1, 65535);
    const settings = {
      enabled,
      workerEnabled,
      authMode,
      user,
      from,
      replyTo,
      fromName: value('MAIL_FROM_NAME', 'Leviatã e o Cativeiro').replace(
        /[\r\n]/g,
        ' ',
      ),
      host: value('MAIL_SMTP_HOST', 'smtp.gmail.com'),
      port,
      secure: boolean('MAIL_SMTP_SECURE', port === 465),
      appPassword,
      clientId,
      clientSecret,
      refreshToken,
      unsubscribeSecret,
      apiUrl: baseUrl('MAIL_PUBLIC_API_URL', 'http://localhost:3000'),
      portalUrl: baseUrl('MAIL_PORTAL_URL', 'http://localhost:5173'),
      dailyLimit: number('MAIL_DAILY_LIMIT', 400, 1, 500),
      intervalMs: number('MAIL_SEND_INTERVAL_MS', 5000, 1000, 3600000),
      maxAttempts: number('MAIL_MAX_ATTEMPTS', 3, 1, 5),
      missing,
    };
    return settings;
  }

  status() {
    const settings = this.settings();
    return {
      enabled: settings.enabled,
      configured: settings.missing.length === 0,
      ready: settings.enabled && settings.missing.length === 0,
      workerEnabled: settings.workerEnabled,
      from: settings.from,
      authMode: settings.authMode,
      missing: settings.missing,
      dailyLimit: settings.dailyLimit,
      intervalMs: settings.intervalMs,
    };
  }

  requireReady() {
    const settings = this.settings();
    if (!settings.enabled || settings.missing.length)
      throw new ServiceUnavailableException(
        'Envio de e-mails desativado ou ainda não configurado. Consulte GET /mail/status.',
      );
    return settings;
  }
}
