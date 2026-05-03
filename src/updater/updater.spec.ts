import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { autoUpdaterMock, BrowserWindowMock, logMock, electronStoreData } =
  vi.hoisted(() => {
    // Inline mini-EventEmitter to avoid importing 'node:events' inside the
    // hoisted factory (vi.hoisted runs before regular imports).
    const listeners = new Map<string, Array<(...args: unknown[]) => void>>();
    const emitter = {
      on(event: string, fn: (...args: unknown[]) => void) {
        const arr = listeners.get(event) ?? [];
        arr.push(fn);
        listeners.set(event, arr);
        return emitter;
      },
      removeAllListeners(event?: string) {
        if (event) listeners.delete(event);
        else listeners.clear();
        return emitter;
      },
      emit(event: string, ...args: unknown[]) {
        for (const fn of listeners.get(event) ?? []) fn(...args);
        return true;
      },
    };
    return {
      autoUpdaterMock: Object.assign(emitter, {
        logger: null as unknown,
        autoDownload: false,
        autoInstallOnAppQuit: false,
        channel: undefined as string | undefined,
        checkForUpdates: vi.fn().mockResolvedValue(undefined),
        quitAndInstall: vi.fn(),
      }),
      BrowserWindowMock: {
        getAllWindows: vi.fn(
          () =>
            [] as Array<{
              isDestroyed: () => boolean;
              webContents: {
                send: (channel: string, payload: unknown) => void;
              };
            }>,
        ),
      },
      logMock: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
      electronStoreData: new Map<string, Record<string, unknown>>(),
    };
  });

vi.mock("electron-updater", () => ({ autoUpdater: autoUpdaterMock }));
vi.mock("electron", () => ({ BrowserWindow: BrowserWindowMock }));
vi.mock("electron-log", () => ({ default: logMock }));
vi.mock("node:fs", () => ({
  default: { existsSync: vi.fn(() => false), unlinkSync: vi.fn() },
}));
vi.mock("electron-store", () => ({
  default: vi.fn().mockImplementation(function (
    this: unknown,
    opts: { name: string; defaults?: Record<string, unknown> },
  ) {
    let data = electronStoreData.get(opts.name);
    if (!data) {
      data = { ...(opts.defaults ?? {}) };
      electronStoreData.set(opts.name, data);
    }
    return {
      get(key: string) {
        return data[key];
      },
      set(key: string, value: unknown) {
        data[key] = value;
      },
      delete(key: string) {
        delete data[key];
      },
      clear() {
        for (const k of Object.keys(data)) delete data[k];
      },
      get store() {
        return { ...data };
      },
    };
  }),
}));

import {
  setupUpdater,
  checkForUpdates,
  quitAndInstall,
  recordAnnouncedRelease,
  primeUpdaterStore,
  _resetUpdaterForTests,
  RETRY_24H,
  CHECK_INTERVAL_6H,
} from "./updater";

function makeWin() {
  return {
    isDestroyed: vi.fn(() => false),
    webContents: { send: vi.fn() },
  };
}

describe("updater module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    electronStoreData.clear();
    autoUpdaterMock.removeAllListeners();
    autoUpdaterMock.autoDownload = false;
    autoUpdaterMock.autoInstallOnAppQuit = false;
    autoUpdaterMock.channel = undefined;
    BrowserWindowMock.getAllWindows.mockReturnValue([]);
    _resetUpdaterForTests();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("constants match the cross-satellite canonical values", () => {
    expect(RETRY_24H).toBe(24 * 60 * 60 * 1000);
    expect(CHECK_INTERVAL_6H).toBe(6 * 60 * 60 * 1000);
  });

  it("setupUpdater configures autoUpdater defaults", () => {
    setupUpdater();
    expect(autoUpdaterMock.autoDownload).toBe(true);
    expect(autoUpdaterMock.autoInstallOnAppQuit).toBe(true);
  });

  it("setupUpdater applies channel option when provided", () => {
    setupUpdater({ channel: "beta" });
    expect(autoUpdaterMock.channel).toBe("beta");
  });

  it("broadcasts checking-for-update to all non-destroyed windows", () => {
    const win = makeWin();
    BrowserWindowMock.getAllWindows.mockReturnValue([win]);
    setupUpdater();
    autoUpdaterMock.emit("checking-for-update");
    expect(win.webContents.send).toHaveBeenCalledWith("updater:status", {
      status: "checking",
    });
  });

  it("skips destroyed windows on broadcast", () => {
    const dead = makeWin();
    dead.isDestroyed.mockReturnValue(true);
    const live = makeWin();
    BrowserWindowMock.getAllWindows.mockReturnValue([dead, live]);
    setupUpdater();
    autoUpdaterMock.emit("update-not-available");
    expect(dead.webContents.send).not.toHaveBeenCalled();
    expect(live.webContents.send).toHaveBeenCalledWith("updater:status", {
      status: "up-to-date",
    });
  });

  it("custom ipcChannel is honored", () => {
    const win = makeWin();
    BrowserWindowMock.getAllWindows.mockReturnValue([win]);
    setupUpdater({ ipcChannel: "custom:status" });
    autoUpdaterMock.emit("update-available", { version: "1.0.0" });
    expect(win.webContents.send).toHaveBeenCalledWith("custom:status", {
      status: "available",
      version: "1.0.0",
    });
  });

  it("persists pendingUpdateVersion on update-downloaded", () => {
    setupUpdater();
    autoUpdaterMock.emit("update-downloaded", { version: "2.0.0" });
    expect(electronStoreData.get("updater.preferences")?.pendingUpdateVersion).toBe(
      "2.0.0",
    );
  });

  it("re-emits pending update from previous session after 2s", () => {
    electronStoreData.set("updater.preferences", {
      pendingUpdateVersion: "1.5.0",
      lastFailedUpdateAt: null,
    });
    const win = makeWin();
    BrowserWindowMock.getAllWindows.mockReturnValue([win]);
    setupUpdater();
    expect(win.webContents.send).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2100);
    expect(win.webContents.send).toHaveBeenCalledWith("updater:status", {
      status: "downloaded",
      version: "1.5.0",
    });
  });

  it("persists lastFailedUpdateAt and broadcasts error", () => {
    const win = makeWin();
    BrowserWindowMock.getAllWindows.mockReturnValue([win]);
    setupUpdater();
    autoUpdaterMock.emit("error", new Error("boom"));
    expect(electronStoreData.get("updater.preferences")?.lastFailedUpdateAt).toBeTypeOf(
      "number",
    );
    expect(win.webContents.send).toHaveBeenCalledWith(
      "updater:status",
      expect.objectContaining({ status: "error", message: "boom" }),
    );
  });

  it("schedules retry after error using retryMs option", () => {
    setupUpdater({ retryMs: 1000 });
    autoUpdaterMock.checkForUpdates.mockClear();
    autoUpdaterMock.emit("error", new Error("network"));
    vi.advanceTimersByTime(999);
    expect(autoUpdaterMock.checkForUpdates).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(autoUpdaterMock.checkForUpdates).toHaveBeenCalled();
  });

  it("suppresses benign releases.atom 404 when opt-in", () => {
    const win = makeWin();
    BrowserWindowMock.getAllWindows.mockReturnValue([win]);
    setupUpdater({ suppressBenignReleasesAtom404: true });
    autoUpdaterMock.emit(
      "error",
      new Error("HttpError: 404 fetching releases.atom"),
    );
    expect(win.webContents.send).not.toHaveBeenCalled();
    expect(logMock.warn).toHaveBeenCalledWith(
      expect.stringContaining("feed indisponível"),
    );
  });

  it("does NOT suppress 404 by default", () => {
    const win = makeWin();
    BrowserWindowMock.getAllWindows.mockReturnValue([win]);
    setupUpdater();
    autoUpdaterMock.emit(
      "error",
      new Error("HttpError: 404 fetching releases.atom"),
    );
    expect(win.webContents.send).toHaveBeenCalledWith(
      "updater:status",
      expect.objectContaining({ status: "error" }),
    );
  });

  it("schedules periodic check at checkIntervalMs", () => {
    setupUpdater({ checkIntervalMs: 5000 });
    autoUpdaterMock.checkForUpdates.mockClear();
    vi.advanceTimersByTime(5001);
    expect(autoUpdaterMock.checkForUpdates).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(5001);
    expect(autoUpdaterMock.checkForUpdates).toHaveBeenCalledTimes(2);
  });

  it("setupUpdater is idempotent (clears prior timers/listeners)", () => {
    setupUpdater({ retryMs: 1000 });
    autoUpdaterMock.emit("error", new Error("first"));
    autoUpdaterMock.checkForUpdates.mockClear();
    setupUpdater({ retryMs: 5000 });
    vi.advanceTimersByTime(2000);
    expect(autoUpdaterMock.checkForUpdates).not.toHaveBeenCalled();
  });

  it("destroy cleans up timers and listeners", () => {
    const handle = setupUpdater({ checkIntervalMs: 1000 });
    handle.destroy();
    autoUpdaterMock.checkForUpdates.mockClear();
    vi.advanceTimersByTime(2000);
    expect(autoUpdaterMock.checkForUpdates).not.toHaveBeenCalled();
    autoUpdaterMock.emit("update-not-available");
    expect(logMock.info).not.toHaveBeenCalledWith(
      expect.stringContaining("Nenhuma atualização disponível"),
    );
  });

  it("cross-checks announced release on update-downloaded (match)", () => {
    setupUpdater();
    recordAnnouncedRelease({
      version: "3.0.0",
      downloadUrl: "https://x/file",
      sha256: "a".repeat(64),
    });
    autoUpdaterMock.emit("update-downloaded", { version: "3.0.0" });
    expect(logMock.info).toHaveBeenCalledWith(
      expect.stringContaining("bateu com release anunciada"),
    );
  });

  it("cross-checks announced release on update-downloaded (divergent)", () => {
    setupUpdater();
    recordAnnouncedRelease({
      version: "3.0.0",
      downloadUrl: "https://x/file",
      sha256: "a".repeat(64),
    });
    autoUpdaterMock.emit("update-downloaded", { version: "3.1.0" });
    expect(logMock.warn).toHaveBeenCalledWith(
      expect.stringContaining("NÃO bate"),
    );
  });

  it("cross-check on update-available (divergent)", () => {
    setupUpdater();
    recordAnnouncedRelease({
      version: "3.0.0",
      downloadUrl: "https://x/file",
      sha256: "a".repeat(64),
    });
    autoUpdaterMock.emit("update-available", { version: "3.1.0" });
    expect(logMock.warn).toHaveBeenCalledWith(
      expect.stringContaining("Versão divergente"),
    );
  });

  it("setupUpdater clears stale announcedRelease on re-init", () => {
    setupUpdater();
    recordAnnouncedRelease({
      version: "3.0.0",
      downloadUrl: "x",
      sha256: "a".repeat(64),
    });
    setupUpdater();
    autoUpdaterMock.emit("update-downloaded", { version: "4.0.0" });
    expect(logMock.warn).not.toHaveBeenCalledWith(
      expect.stringContaining("NÃO bate"),
    );
  });

  it("checkForUpdates rethrows errors", async () => {
    setupUpdater();
    autoUpdaterMock.checkForUpdates.mockRejectedValueOnce(new Error("net fail"));
    await expect(checkForUpdates()).rejects.toThrow("net fail");
  });

  it("checkForUpdates broadcasts error before rethrow", async () => {
    const win = makeWin();
    BrowserWindowMock.getAllWindows.mockReturnValue([win]);
    setupUpdater();
    autoUpdaterMock.checkForUpdates.mockRejectedValueOnce(new Error("net fail"));
    await expect(checkForUpdates()).rejects.toThrow();
    expect(win.webContents.send).toHaveBeenCalledWith(
      "updater:status",
      expect.objectContaining({ status: "error", message: "net fail" }),
    );
  });

  it("quitAndInstall clears pending and forwards default flags", () => {
    setupUpdater();
    electronStoreData.get("updater.preferences")!.pendingUpdateVersion = "x";
    quitAndInstall();
    expect(electronStoreData.get("updater.preferences")?.pendingUpdateVersion).toBeNull();
    expect(autoUpdaterMock.quitAndInstall).toHaveBeenCalledWith(true, true);
  });

  it("quitAndInstall honors custom flags", () => {
    setupUpdater({ quitAndInstallFlags: { silent: false, forceRunAfter: true } });
    quitAndInstall();
    expect(autoUpdaterMock.quitAndInstall).toHaveBeenCalledWith(false, true);
  });

  it("primeUpdaterStore seeds default-null fields", () => {
    primeUpdaterStore({ pendingUpdateVersion: "1.6.3", lastFailedUpdateAt: 12345 });
    expect(electronStoreData.get("updater.preferences")).toEqual(
      expect.objectContaining({
        pendingUpdateVersion: "1.6.3",
        lastFailedUpdateAt: 12345,
      }),
    );
  });

  it("primeUpdaterStore is idempotent (does not clobber non-default values)", () => {
    primeUpdaterStore({ pendingUpdateVersion: "1.0.0" });
    primeUpdaterStore({ pendingUpdateVersion: "2.0.0" });
    expect(electronStoreData.get("updater.preferences")?.pendingUpdateVersion).toBe(
      "1.0.0",
    );
  });
});
