import { BrowserWindow } from "electron";
import { z } from "zod";
/** 24-hour flat retry on failure. */
export declare const RETRY_24H: number;
/** 6-hour periodic check interval. */
export declare const CHECK_INTERVAL_6H: number;
declare const updaterPrefsSchema: z.ZodObject<{
    pendingUpdateVersion: z.ZodNullable<z.ZodString>;
    lastFailedUpdateAt: z.ZodNullable<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    pendingUpdateVersion: string | null;
    lastFailedUpdateAt: number | null;
}, {
    pendingUpdateVersion: string | null;
    lastFailedUpdateAt: number | null;
}>;
export type UpdaterPrefs = z.infer<typeof updaterPrefsSchema>;
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
    quitAndInstallFlags?: {
        silent: boolean;
        forceRunAfter: boolean;
    };
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
export type UpdateStatusPayload = {
    status: "checking";
} | {
    status: "available";
    version: string;
} | {
    status: "up-to-date";
} | {
    status: "downloading";
    progress: number;
} | {
    status: "downloaded";
    version: string;
} | {
    status: "error";
    error: string;
    message: string;
    lastFailedAt: number | null;
};
/**
 * Configure electron-updater with idempotent setup, broadcasting via IPC,
 * persistence, periodic check, and retry. Returns an `UpdaterHandle` whose
 * `destroy()` cleans up timers and listeners.
 *
 * Calling `setupUpdater` more than once is safe — internal timers/listeners
 * are torn down before re-registering. Module-level `announcedRelease` is
 * also reset to avoid stale cross-checks across re-init.
 */
export declare function setupUpdater(options?: SetupUpdaterOptions): UpdaterHandle;
/**
 * Trigger an explicit update check. Errors are broadcast via IPC and
 * re-thrown so the caller can surface them (matches PrintServer behavior).
 */
export declare function checkForUpdates(): Promise<void>;
/**
 * Quit the app and install the downloaded update. Clears persisted
 * `pendingUpdateVersion` first so a partial install isn't re-announced on
 * the next boot.
 *
 * Throws if called before `setupUpdater()` — without setup, the resolved
 * `quitAndInstallFlags` would silently fall back to the runtime default
 * `(true, true)`, which is wrong for any satellite that needs a custom
 * NSIS behavior (Codex post-impl review fix Issue 4).
 */
export declare function quitAndInstall(): void;
/**
 * Record a release announcement received over the satellite WebSocket
 * (Satellite Contract `app.release.published`). Same-session best-effort —
 * not persisted across restarts. Used to cross-check the version
 * `electron-updater` actually downloads against the version the backend said
 * was published.
 */
export declare function recordAnnouncedRelease(release: AnnouncedRelease): void;
/**
 * Seed the runtime updater preference store with values from an external
 * source (used by satellites bridging legacy state from their own store
 * during migration to the runtime). Idempotent — only writes a key if its
 * current value is the schema default (null), so subsequent calls cannot
 * clobber explicit user/runtime writes.
 *
 * Semantics for each seed key:
 *   - `undefined`     → ignored (no write)
 *   - `null` or value → applied IF the runtime store still holds the
 *                       schema default (null); otherwise ignored
 *
 * Passing `null` explicitly is allowed so a satellite can write a "known
 * empty" marker during bridge — but in practice the bridge in main.ts
 * already gates on legacy values being non-null before calling, so the
 * null path is mostly defensive (Codex post-impl review fix Issue 5).
 */
export declare function primeUpdaterStore(seed: Partial<UpdaterPrefs>): void;
/** @internal — for tests */
export declare function _resetUpdaterForTests(): void;
/** @internal — for tests */
export declare function _isUpdaterInitialized(): boolean;
export {};
//# sourceMappingURL=updater.d.ts.map