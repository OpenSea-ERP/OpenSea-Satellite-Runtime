/**
 * Minimal i18n / locale formatters. Default locale `pt-BR`. Wraps Intl.* APIs.
 * Satellites can override locale per-call via `locale` arg.
 */

let defaultLocale = "pt-BR";

export function setDefaultLocale(locale: string): void {
  defaultLocale = locale;
}

export function getDefaultLocale(): string {
  return defaultLocale;
}

export function formatDate(
  date: Date | number | string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "short" },
  locale = defaultLocale,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, options).format(d);
}

export function formatTime(
  date: Date | number | string,
  options: Intl.DateTimeFormatOptions = { timeStyle: "short" },
  locale = defaultLocale,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, options).format(d);
}

export function formatNumber(
  value: number,
  options: Intl.NumberFormatOptions = {},
  locale = defaultLocale,
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatCurrency(
  cents: number,
  currency = "BRL",
  locale = defaultLocale,
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function formatRelativeTime(
  fromMs: number,
  nowMs = Date.now(),
  locale = defaultLocale,
): string {
  const diffMs = fromMs - nowMs;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const abs = Math.abs(diffMs);
  if (abs < 60_000) return rtf.format(Math.round(diffMs / 1000), "second");
  if (abs < 3_600_000) return rtf.format(Math.round(diffMs / 60_000), "minute");
  if (abs < 86_400_000) return rtf.format(Math.round(diffMs / 3_600_000), "hour");
  return rtf.format(Math.round(diffMs / 86_400_000), "day");
}
