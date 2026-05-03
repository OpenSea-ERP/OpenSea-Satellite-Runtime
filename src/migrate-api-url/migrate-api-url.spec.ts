import { describe, it, expect, vi, beforeEach } from "vitest";

const { appMock, logMock } = vi.hoisted(() => ({
  appMock: { isPackaged: true },
  logMock: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("electron", () => ({ app: appMock }));
vi.mock("electron-log", () => ({ default: logMock }));

import { migrateApiUrl } from "./migrate-api-url";

describe("migrateApiUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appMock.isPackaged = true;
  });

  it("rewrites stale URL in packaged build", () => {
    const write = vi.fn();
    migrateApiUrl({
      read: () => "http://localhost:3333",
      write,
      staleUrls: new Set(["http://localhost:3333"]),
      canonicalUrl: "https://api.x/",
    });
    expect(write).toHaveBeenCalledWith("https://api.x/");
  });

  it("no-op in dev (app.isPackaged=false)", () => {
    appMock.isPackaged = false;
    const write = vi.fn();
    migrateApiUrl({
      read: () => "http://localhost:3333",
      write,
      staleUrls: ["http://localhost:3333"],
      canonicalUrl: "https://api.x/",
    });
    expect(write).not.toHaveBeenCalled();
  });

  it("force=true overrides dev no-op", () => {
    appMock.isPackaged = false;
    const write = vi.fn();
    migrateApiUrl({
      read: () => "http://localhost:3333",
      write,
      staleUrls: ["http://localhost:3333"],
      canonicalUrl: "https://api.x/",
      force: true,
    });
    expect(write).toHaveBeenCalled();
  });

  it("does NOT rewrite when current is not in stale set", () => {
    const write = vi.fn();
    migrateApiUrl({
      read: () => "https://current.x/",
      write,
      staleUrls: ["http://localhost:3333"],
      canonicalUrl: "https://api.x/",
    });
    expect(write).not.toHaveBeenCalled();
  });

  it("accepts array OR Set for staleUrls", () => {
    const writeArr = vi.fn();
    const writeSet = vi.fn();
    migrateApiUrl({
      read: () => "stale",
      write: writeArr,
      staleUrls: ["stale"],
      canonicalUrl: "fresh",
    });
    migrateApiUrl({
      read: () => "stale",
      write: writeSet,
      staleUrls: new Set(["stale"]),
      canonicalUrl: "fresh",
    });
    expect(writeArr).toHaveBeenCalledWith("fresh");
    expect(writeSet).toHaveBeenCalledWith("fresh");
  });

  it("swallows read errors and logs", () => {
    const read = vi.fn(() => {
      throw new Error("read fail");
    });
    expect(() =>
      migrateApiUrl({
        read,
        write: vi.fn(),
        staleUrls: ["x"],
        canonicalUrl: "y",
      }),
    ).not.toThrow();
    expect(logMock.error).toHaveBeenCalled();
  });
});
