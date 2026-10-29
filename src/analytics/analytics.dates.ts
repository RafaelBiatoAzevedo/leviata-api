import { BadRequestException } from '@nestjs/common';
import { AnalyticsRange, RETENTION_DAYS, TIMEZONE } from './analytics.contract';

export function localDay(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
export function addDays(day: string, count: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}
export function validDay(day: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(day) &&
    Number.isFinite(Date.parse(`${day}T12:00:00Z`)) &&
    new Date(`${day}T12:00:00Z`).toISOString().slice(0, 10) === day
  );
}
export function analyticsRange(
  from?: string,
  to?: string,
  now = new Date(),
): AnalyticsRange {
  const today = localDay(now);
  const end = to ?? today;
  const start = from ?? addDays(end, -29);
  if (!validDay(start) || !validDay(end))
    throw new BadRequestException('Use datas válidas no formato AAAA-MM-DD.');
  const days = Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
  if (
    days < 1 ||
    days > 90 ||
    end > today ||
    start < addDays(today, 1 - RETENTION_DAYS)
  )
    throw new BadRequestException(
      'Selecione até 90 dias, sem datas futuras e dentro da retenção de 180 dias.',
    );
  return {
    from: start,
    to: end,
    days,
    previousFrom: addDays(start, -days),
    previousTo: addDays(start, -1),
  };
}
