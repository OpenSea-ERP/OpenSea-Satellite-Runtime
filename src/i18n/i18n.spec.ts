import { describe, it, expect, beforeEach } from "vitest";
import {
  setDefaultLocale,
  getDefaultLocale,
  formatDate,
  formatTime,
  formatNumber,
  formatCurrency,
  formatRelativeTime,
} from "./i18n";

describe("i18n formatters", () => {
  beforeEach(() => {
    setDefaultLocale("pt-BR");
  });

  it("default locale is pt-BR", () => {
    expect(getDefaultLocale()).toBe("pt-BR");
  });

  it("formatCurrency formats BRL by default", () => {
    expect(formatCurrency(12345)).toMatch(/R\$\s?123,45/);
  });

  it("formatCurrency accepts custom currency", () => {
    const result = formatCurrency(10000, "USD", "en-US");
    expect(result).toContain("$");
  });

  it("formatNumber respects pt-BR thousands separator", () => {
    expect(formatNumber(1234567.89)).toBe("1.234.567,89");
  });

  it("formatDate works with ISO string", () => {
    const out = formatDate("2026-05-03T12:00:00Z", { dateStyle: "short" });
    expect(out).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it("formatTime renders short time", () => {
    const out = formatTime(new Date("2026-05-03T15:30:00Z"));
    expect(out).toMatch(/\d{1,2}:\d{2}/);
  });

  it("formatRelativeTime returns past/future labels", () => {
    const now = Date.now();
    const past = now - 65_000; // 1 min ago
    expect(formatRelativeTime(past, now)).toMatch(/atrás|min/);
  });

  it("setDefaultLocale changes subsequent formats", () => {
    setDefaultLocale("en-US");
    expect(formatNumber(1234.5)).toBe("1,234.5");
  });
});
