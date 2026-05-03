/**
 * Minimal i18n / locale formatters. Default locale `pt-BR`. Wraps Intl.* APIs.
 * Satellites can override locale per-call via `locale` arg.
 */
export declare function setDefaultLocale(locale: string): void;
export declare function getDefaultLocale(): string;
export declare function formatDate(date: Date | number | string, options?: Intl.DateTimeFormatOptions, locale?: string): string;
export declare function formatTime(date: Date | number | string, options?: Intl.DateTimeFormatOptions, locale?: string): string;
export declare function formatNumber(value: number, options?: Intl.NumberFormatOptions, locale?: string): string;
export declare function formatCurrency(cents: number, currency?: string, locale?: string): string;
export declare function formatRelativeTime(fromMs: number, nowMs?: number, locale?: string): string;
//# sourceMappingURL=i18n.d.ts.map