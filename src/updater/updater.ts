/**
 * Auto-updater wrapper over `electron-updater`.
 *
 * Extracts the canonical pattern shared by all OpenSea satellites: idempotent
 * setup, periodic check (default 6h), retry-on-error (default 24h), persisted
 * `pendingUpdateVersion` re-emit on next boot, optional WS announcement
 * cross-check (Satellite Contract `app.release.published`), opt-in benign 404
 * suppression for private repos without GitHub token.
 *
 * State persisted via `createStore` namespaced as `updater.preferences` —
 * the satellite never has to mount the store itself.
 */
import { autoUpdater } from "electron-updater";
import { BrowserWindow } from "electron";
import log from "electron-log";
import { z } from "zod";
import { createStore, type SatelliteStore } from "../store/store";

// ── Timing constants (paridade com Horus + Emporion + PrintServer) ─────────
/** 24-hour flat retry on failure. */
export const RETRY_24H = 24 * 60 * 60 * 1000;
/** 6-hour periodic check interval. */
export const CHECK_INTERVAL_6H = 6 * 60 * 60 * 1000;

// ── Persistent prefs schema ────────────────────────────────────────────────
const updaterPrefsSchema = z.object({
  pendingUpdateVersion: z.string().nullable(),
  lastFailedUpdateAt: z.number().nullable(),
});
export type UpdaterPrefs = z.infer<typeof updaterPrefsSchema>;

let prefStore: SatelliteStore<typeof updaterPrefsSchema> | null = null;

function getPrefStore(): SatelliteStore<typeof updaterPrefsSchema> {
  if (!prefStore) {
    prefStore = createStore({
      name: "updater.preferences",
      schema: updaterPrefsSchema,
      defaults: { pendingUpdateVersion: null, lastFailedUpdateAt: null },
    });
  }
  return prefStore;
}

// ── Public API types ───────────────────────────────────────────────────────
export interface SetupUpdaterOptions {
  /**
   * Window factory for IPC broadcast. Default `() => BrowserWindow.getAllWindows()`.
   * Each window is filtered against `isDestroyed()` before send.
   */
  windows?: () => BrowserWindow[];
  /**
   * Suppress the benign 404 from `releases.atom` (private repos without
   * GitHub token in the bundled build). Default `false` — public repos
   * should NOT enable this, as it would hide legitimate failures.
   */
  suppressBenignReleasesAtom404?: boolean;
  /** Release channel. Default `'latest'`. */
  channel?: "latest" | "beta";
  /** electron-updater autoDownload. Default `true`. */
  autoDownload?: boolean;
  /** electron-updater autoInstallOnAppQuit. Default `true`. */
  autoInstallOnAppQuit?: boolean;
  /**
   * Flags forwarded to `autoUpdater.quitAndInstall(silent, forceRunAfter)`.
   * Default `{ silent: true, forceRunAfter: true }` (Emporion-style).
   * PrintServer pilot must override with `silent: false` (NSIS not audited
   * for silent install — see spec amendment B-A3).
   */
  quitAndInstallFlags?: { silent: boolean; forceRunAfter: boolean };
  /** Periodic check interval in ms. Default `RETRY_24H` divisor → `CHECK_INTERVAL_6H`. */
  checkIntervalMs?: number;
  /** Retry-after-error delay in ms. Default `RETRY_24H`. */
  retryMs?: number;
  /** IPC channel for broadcast. Default `'updater:status'`. */
  ipcChannel?: string;
}

export interface UpdaterHandle {
  /** Cleanup: clears interval, retry timer, and listeners. Idempotent. */
  destroy(): void;
}

export interface AnnouncedRelease {
  version: string;
  downloadUrl: string;
  sha256: string;
}

export type UpdateStatusPayload =
  | { status: "checking" }
  | { status: "available"; version: string }
  | { status: "up-to-date" }
  | { status: "downloading"; progress: number }
  | { status: "downloaded"; version: string }
  | {
      status: "error";
      error: string;
      message: string;
      lastFailedAt: number | null;
    };

// ── Module-level state ─────────────────────────────────────────────────────
interface InternalAnnounced {
  version: string;
  downloadUrl: string;
  sha256: string;
  announcedAt: number;
}
let announcedRelease: InternalAnnounced | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let checkInterval: ReturnType<typeof setInterval> | null = null;
let pendingReemitTimer: ReturnType<typeof setTimeout> | null = null;
let resolvedFlags: SetupUpdaterOptions["quitAndInstallFlags"] = {
  silent: true,
  forceRunAfter: true,
};
let resolvedIpcChannel = "updater:status";
let resolvedSuppress404 = false;
let resolvedRetryMs = RETRY_24H;
let resolvedCheckIntervalMs = CHECK_INTERVAL_6H;
let resolvedWindows: () => BrowserWindow[] = () =>
  BrowserWindow.getAllWindows();
let initialized = false;

// ── Helpers ────────────────────────────────────────────────────────────────
function broadcast(payload: UpdateStatusPayload): void {
  for (const win of resolvedWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(resolvedIpcChannel, payload);
    }
  }
}

function clearInternalTimers(): void {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
  if (pendingReemitTimer) {
    clearTimeout(pendingReemitTimer);
    pendingReemitTimer = null;
  }
}

function clearAutoUpdaterListeners(): void {
  autoUpdater.removeAllListeners("checking-for-update");
  autoUpdater.removeAllListeners("update-available");
  autoUpdater.removeAllListeners("update-not-available");
  autoUpdater.removeAllListeners("download-progress");
  autoUpdater.removeAllListeners("update-downloaded");
  autoUpdater.removeAllListeners("error");
}

function isBenignReleasesAtom404(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err ?? "");
  return message.includes("404") && message.includes("releases.atom");
}

function reportError(err: unknown): void {
  if (resolvedSuppress404 && isBenignReleasesAtom404(err)) {
    log.warn(
      "[satellite-runtime/updater] feed indisponível (repo privado sem token); update manual requerido",
    );
    return;
  }
  const message = err instanceof Error ? err.message : "Erro desconhecido";
  log.error("[satellite-runtime/updater] Erro:", err);

  getPrefStore().set("lastFailedUpdateAt", Date.now());

  broadcast({
    status: "error",
    error: message,
    message,
    lastFailedAt: getPrefStore().get("lastFailedUpdateAt"),
  });

  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = setTimeout(() => {
    log.info(
      "[satellite-runtime/updater] Retry — verificando atualizações novamente...",
    );
    void autoUpdater
      .checkForUpdates()
      .catch((e) =>
        log.warn("[satellite-runtime/updater] retry falhou:", e),
      );
  }, resolvedRetryMs);
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Configure electron-updater with idempotent setup, broadcasting via IPC,
 * persistence, periodic check, and retry. Returns an `UpdaterHandle` whose
 * `destroy()` cleans up timers and listeners.
 *
 * Calling `setupUpdater` more than once is safe — internal timers/listeners
 * are torn down before re-registering. Module-level `announcedRelease` is
 * also reset to avoid stale cross-checks across re-init.
 */
export function setupUpdater(options: SetupUpdaterOptions = {}): UpdaterHandle {
  // Idempotency
  clearInternalTimers();
  clearAutoUpdaterListeners();
  announcedRelease = null;

  resolvedFlags = options.quitAndInstallFlags ?? {
    silent: true,
    forceRunAfter: true,
  };
  resolvedIpcChannel = options.ipcChannel ?? "updater:status";
  resolvedSuppress404 = options.suppressBenignReleasesAtom404 ?? false;
  resolvedRetryMs = options.retryMs ?? RETRY_24H;
  resolvedCheckIntervalMs = options.checkIntervalMs ?? CHECK_INTERVAL_6H;
  resolvedWindows = options.windows ?? (() => BrowserWindow.getAllWindows());

  autoUpdater.logger = log;
  autoUpdater.autoDownload = options.autoDownload ?? true;
  autoUpdater.autoInstallOnAppQuit = options.autoInstallOnAppQuit ?? true;
  if (options.channel) {
    autoUpdater.channel = options.channel;
  }

  autoUpdater.on("checking-for-update", () => {
    log.info("[satellite-runtime/updater] Verificando atualizações...");
    broadcast({ status: "checking" });
  });

  autoUpdater.on("update-available", (info) => {
    log.info("[satellite-runtime/updater] Atualização disponível:", info.version);
    if (announcedRelease && announcedRelease.version !== info.version) {
      log.warn(
        `[satellite-runtime/updater] Versão divergente: backend anunciou ${announcedRelease.version} via WS, electron-updater encontrou ${info.version}.`,
      );
    }
    broadcast({ status: "available", version: info.version });
  });

  autoUpdater.on("update-not-available", () => {
    log.info("[satellite-runtime/updater] Nenhuma atualização disponível");
    broadcast({ status: "up-to-date" });
  });

  autoUpdater.on("download-progress", (progress) => {
    broadcast({ status: "downloading", progress: progress.percent });
  });

  autoUpdater.on("update-downloaded", (info) => {
    log.info("[satellite-runtime/updater] Atualização baixada:", info.version);
    if (announcedRelease) {
      if (announcedRelease.version === info.version) {
        log.info(
          `[satellite-runtime/updater] Download bateu com release anunciada (v${info.version})`,
        );
      } else {
        log.warn(
          `[satellite-runtime/updater] Download v${info.version} NÃO bate com anúncio v${announcedRelease.version}.`,
        );
      }
    }
    getPrefStore().set("pendingUpdateVersion", info.version);
    broadcast({ status: "downloaded", version: info.version });
  });

  autoUpdater.on("error", reportError);

  // Re-emit pending update from previous session, after small delay so the
  // renderer is ready to receive.
  const pending = getPrefStore().get("pendingUpdateVersion");
  if (pending) {
    log.info(
      `[satellite-runtime/updater] Update ${pending} pendente de instalação (sessão anterior)`,
    );
    pendingReemitTimer = setTimeout(() => {
      broadcast({ status: "downloaded", version: pending });
    }, 2000);
  }

  // Periodic check
  checkInterval = setInterval(() => {
    log.info("[satellite-runtime/updater] Verificação periódica...");
    void autoUpdater
      .checkForUpdates()
      .catch((e) =>
        log.warn("[satellite-runtime/updater] check periódico falhou:", e),
      );
  }, resolvedCheckIntervalMs);

  initialized = true;

  return {
    destroy() {
      clearInternalTimers();
      clearAutoUpdaterListeners();
      announcedRelease = null;
      initialized = false;
    },
  };
}

/**
 * Trigger an explicit update check. Errors are broadcast via IPC and
 * re-thrown so the caller can surface them (matches PrintServer behavior).
 */
export async function checkForUpdates(): Promise<void> {
  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error("[satellite-runtime/updater] Erro ao verificar atualizações:", error);
    if (!(resolvedSuppress404 && isBenignReleasesAtom404(error))) {
      broadcast({
        status: "error",
        error: message,
        message,
        lastFailedAt: getPrefStore().get("lastFailedUpdateAt"),
      });
    }
    throw error;
  }
}

/**
 * Quit the app and install the downloaded update. Clears persisted
 * `pendingUpdateVersion` first so a partial install isn't re-announced on
 * the next boot.
 */
export function quitAndInstall(): void {
  getPrefStore().set("pendingUpdateVersion", null);
  const flags = resolvedFlags ?? { silent: true, forceRunAfter: true };
  autoUpdater.quitAndInstall(flags.silent, flags.forceRunAfter);
}

/**
 * Record a release announcement received over the satellite WebSocket
 * (Satellite Contract `app.release.published`). Same-session best-effort —
 * not persisted across restarts. Used to cross-check the version
 * `electron-updater` actually downloads against the version the backend said
 * was published.
 */
export function recordAnnouncedRelease(release: AnnouncedRelease): void {
  announcedRelease = { ...release, announcedAt: Date.now() };
  log.info(
    `[satellite-runtime/updater] Release ${release.version} anunciada via WS — sha256=${release.sha256.slice(0, 16)}…`,
  );
}

/**
 * Seed the runtime updater preference store with values from an external
 * source (used by satellites bridging legacy state from their own store
 * during migration to the runtime). Idempotent — only writes a key if its
 * current value is the schema default (null), so subsequent calls cannot
 * clobber explicit user/runtime writes.
 */
export function primeUpdaterStore(seed: Partial<UpdaterPrefs>): void {
  const store = getPrefStore();
  if (
    seed.pendingUpdateVersion !== undefined &&
    seed.pendingUpdateVersion !== null &&
    store.get("pendingUpdateVersion") === null
  ) {
    store.set("pendingUpdateVersion", seed.pendingUpdateVersion);
  }
  if (
    seed.lastFailedUpdateAt !== undefined &&
    seed.lastFailedUpdateAt !== null &&
    store.get("lastFailedUpdateAt") === null
  ) {
    store.set("lastFailedUpdateAt", seed.lastFailedUpdateAt);
  }
}

/** @internal — for tests */
export function _resetUpdaterForTests(): void {
  clearInternalTimers();
  clearAutoUpdaterListeners();
  announcedRelease = null;
  prefStore = null;
  initialized = false;
}

/** @internal — for tests */
export function _isUpdaterInitialized(): boolean {
  return initialized;
}
