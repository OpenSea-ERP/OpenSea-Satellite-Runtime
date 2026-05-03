import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { logMock } = vi.hoisted(() => ({
  logMock: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

vi.mock("electron-log", () => ({ default: logMock }));

import {
  setupFeatureFlags,
  stopFeatureFlags,
  isEnabled,
  getString,
  snapshot,
} from "./feature-flags";

describe("feature-flags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stopFeatureFlags();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    stopFeatureFlags();
  });

  it("uses defaults until first fetch", () => {
    setupFeatureFlags({
      endpoint: () => "https://x",
      defaults: { darkMode: true, theme: "blue" },
      fetchImpl: vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as never,
    });
    expect(isEnabled("darkMode")).toBe(true);
    expect(getString("theme")).toBe("blue");
  });

  it("merges fetched values over defaults", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ darkMode: false, newFlag: true }),
    });
    setupFeatureFlags({
      endpoint: () => "https://x",
      defaults: { darkMode: true },
      fetchImpl: fetchImpl as never,
    });
    await vi.advanceTimersByTimeAsync(1);
    expect(isEnabled("darkMode")).toBe(false);
    expect(isEnabled("newFlag")).toBe(true);
  });

  it("keeps cache on fetch failure", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("net"));
    setupFeatureFlags({
      endpoint: () => "x",
      defaults: { x: true },
      fetchImpl: fetchImpl as never,
    });
    await vi.advanceTimersByTimeAsync(1);
    expect(isEnabled("x")).toBe(true);
  });

  it("polls at intervalMs", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    setupFeatureFlags({
      endpoint: () => "x",
      pollIntervalMs: 1000,
      fetchImpl: fetchImpl as never,
    });
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1100);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("isEnabled accepts string 'true'", () => {
    setupFeatureFlags({
      endpoint: () => "x",
      defaults: { f: "true" },
      fetchImpl: vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as never,
    });
    expect(isEnabled("f")).toBe(true);
  });

  it("getString returns fallback for missing", () => {
    setupFeatureFlags({
      endpoint: () => "x",
      fetchImpl: vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as never,
    });
    expect(getString("missing", "fallback")).toBe("fallback");
  });

  it("authHeader applied", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    setupFeatureFlags({
      endpoint: () => "x",
      authHeader: () => "Bearer X",
      fetchImpl: fetchImpl as never,
    });
    await vi.advanceTimersByTimeAsync(1);
    const init = fetchImpl.mock.calls[0]?.[1] as { headers: Record<string, string> };
    expect(init.headers.Authorization).toBe("Bearer X");
  });

  it("snapshot returns frozen-ish copy", () => {
    setupFeatureFlags({
      endpoint: () => "x",
      defaults: { a: true },
      fetchImpl: vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as never,
    });
    const snap = snapshot();
    expect(snap.a).toBe(true);
  });
});
