import { describe, it, expect, beforeEach, vi } from "vitest";
import log from "electron-log";
import { setupLog, getLogger, _resetLogForTests } from "./log";

vi.mock("electron-log", () => ({
  default: {
    transports: {
      file: { level: "info", format: "", maxSize: 0 },
      console: { level: "info", format: "" },
    },
    scope: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    })),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("log module", () => {
  beforeEach(() => {
    _resetLogForTests();
    vi.clearAllMocks();
    log.transports.file.level = "info";
    log.transports.file.format = "";
    log.transports.file.maxSize = 0;
    log.transports.console.level = "info";
    log.transports.console.format = "";
  });

  it("configures level and format on first setupLog call", () => {
    setupLog({ scope: "test-app" });
    expect(log.transports.file.level).toBe("info");
    expect(log.transports.file.format).toContain("{scope}");
    expect(log.transports.console.format).toContain("{scope}");
  });

  it("respects custom level", () => {
    setupLog({ scope: "test-app", level: "debug" });
    expect(log.transports.file.level).toBe("debug");
    expect(log.transports.console.level).toBe("debug");
  });

  it("respects custom rotation maxSizeMb", () => {
    setupLog({ scope: "test-app", rotation: { maxSizeMb: 25 } });
    expect(log.transports.file.maxSize).toBe(25 * 1024 * 1024);
  });

  it("uses default 10MB rotation when not provided", () => {
    setupLog({ scope: "test-app" });
    expect(log.transports.file.maxSize).toBe(10 * 1024 * 1024);
  });

  it("is idempotent (2nd call warns and skips)", () => {
    setupLog({ scope: "test-app" });
    setupLog({ scope: "other-app", level: "error" });
    expect(log.transports.file.level).toBe("info");
    expect(log.warn).toHaveBeenCalledWith(
      expect.stringContaining("already called"),
    );
  });

  it("getLogger returns a scoped logger", () => {
    setupLog({ scope: "test-app" });
    const child = getLogger("ws");
    expect(log.scope).toHaveBeenCalledWith("ws");
    expect(child.info).toBeDefined();
  });
});
