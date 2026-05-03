"use strict";
/**
 * Minimal i18n / locale formatters. Default locale `pt-BR`. Wraps Intl.* APIs.
 * Satellites can override locale per-call via `locale` arg.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.setDefaultLocale = setDefaultLocale;
exports.getDefaultLocale = getDefaultLocale;
exports.formatDate = formatDate;
exports.formatTime = formatTime;
exports.formatNumber = formatNumber;
exports.formatCurrency = formatCurrency;
exports.formatRelativeTime = formatRelativeTime;
let defaultLocale = "pt-BR";
function setDefaultLocale(locale) {
    defaultLocale = locale;
}
function getDefaultLocale() {
    return defaultLocale;
}
function formatDate(date, options = { dateStyle: "short" }, locale = defaultLocale) {
    const d = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat(locale, options).format(d);
}
function formatTime(date, options = { timeStyle: "short" }, locale = defaultLocale) {
    const d = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat(locale, options).format(d);
}
function formatNumber(value, options = {}, locale = defaultLocale) {
    return new Intl.NumberFormat(locale, options).format(value);
}
function formatCurrency(cents, currency = "BRL", locale = defaultLocale) {
    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
    }).format(cents / 100);
}
function formatRelativeTime(fromMs, nowMs = Date.now(), locale = defaultLocale) {
    const diffMs = fromMs - nowMs;
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    const abs = Math.abs(diffMs);
    if (abs < 60_000)
        return rtf.format(Math.round(diffMs / 1000), "second");
    if (abs < 3_600_000)
        return rtf.format(Math.round(diffMs / 60_000), "minute");
    if (abs < 86_400_000)
        return rtf.format(Math.round(diffMs / 3_600_000), "hour");
    return rtf.format(Math.round(diffMs / 86_400_000), "day");
}
//# sourceMappingURL=i18n.js.map