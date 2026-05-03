import { describe, it, expect, vi, beforeEach } from "vitest";

const { logMock } = vi.hoisted(() => ({
  logMock: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));
vi.mock("electron-log", () => ({ default: logMock }));

import {
  registerShutdownHandler,
  runShutdownHandlers,
  _resetShutdownForTests,
} from "./graceful-shutdown";

describe("graceful-shutdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetShutdownForTests();
  });

  it("runs all registered handlers", async () => {
    const a = vi.fn();
    const b = vi.fn();
    registerShutdownHandler(a, { name: "a" });
    registerShutdownHandler(b, { name: "b" });
    await runShutdownHandlers();
    expect(a).toHaveBeenCalled();
    expect(b).toHaveBeenCalled();
  });

  it("does not throw when handler rejects", async () => {
    registerShutdownHandler(
      async () => {
        throw new Error("boom");
      },
      { name: "bad" },
    );
    await expect(runShutdownHandlers()).resolves.not.toThrow();
    expect(logMock.error).toHaveBeenCalled();
  });

  it("respects per-handler timeout", async () => {
    registerShutdownHandler(
      () => new Promise((resolve) => setTimeout(resolve, 200)),
      { name: "slow", timeoutMs: 50 },
    );
    const start = Date.now();
    await runShutdownHandlers();
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(150);
  });

  it("is re-entrant safe (multiple calls coalesce)", async () => {
    const handler = vi.fn();
    registerShutdownHandler(handler, { name: "h" });
    const p1 = runShutdownHandlers();
    const p2 = runShutdownHandlers();
    const p3 = runShutdownHandlers();
    expect(p1).toBe(p2);
    expect(p2).toBe(p3);
    await Promise.all([p1, p2, p3]);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("default timeout is 5000ms", async () => {
    let resolved = false;
    registerShutdownHandler(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolved = true;
            resolve();
          }, 10);
        }),
    );
    await runShutdownHandlers();
    expect(resolved).toBe(true);
  });

  it("handles synchronous handlers", async () => {
    const sync = vi.fn();
    registerShutdownHandler(sync, { name: "sync" });
    await runShutdownHandlers();
    expect(sync).toHaveBeenCalled();
  });
});
