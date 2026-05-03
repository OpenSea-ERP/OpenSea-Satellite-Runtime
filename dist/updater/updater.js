"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHECK_INTERVAL_6H = exports.RETRY_24H = void 0;
exports.setupUpdater = setupUpdater;
exports.checkForUpdates = checkForUpdates;
exports.quitAndInstall = quitAndInstall;
exports.recordAnnouncedRelease = recordAnnouncedRelease;
exports.primeUpdaterStore = primeUpdaterStore;
exports._resetUpdaterForTests = _resetUpdaterForTests;
exports._isUpdaterInitialized = _isUpdaterInitialized;
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
const electron_updater_1 = require("electron-updater");
const electron_1 = require("electron");
const electron_log_1 = __importDefault(require("electron-log"));
const zod_1 = require("zod");
const store_1 = require("../store/store");
// ── Timing constants (paridade com Horus + Emporion + PrintServer) ─────────
/** 24-hour flat retry on failure. */
exports.RETRY_24H = 24 * 60 * 60 * 1000;
/** 6-hour periodic check interval. */
exports.CHECK_INTERVAL_6H = 6 * 60 * 60 * 1000;
// ── Persistent prefs schema ────────────────────────────────────────────────
const updaterPrefsSchema = zod_1.z.object({
    pendingUpdateVersion: zod_1.z.string().nullable(),
    lastFailedUpdateAt: zod_1.z.number().nullable(),
});
let prefStore = null;
function getPrefStore() {
    if (!prefStore) {
        prefStore = (0, store_1.createStore)({
            name: "updater.preferences",
            schema: updaterPrefsSchema,
            defaults: { pendingUpdateVersion: null, lastFailedUpdateAt: null },
        });
    }
    return prefStore;
}
let announcedRelease = null;
let retryTimer = null;
let checkInterval = null;
let pendingReemitTimer = null;
let resolvedFlags = {
    silent: true,
    forceRunAfter: true,
};
let resolvedIpcChannel = "updater:status";
let resolvedSuppress404 = false;
let resolvedRetryMs = exports.RETRY_24H;
let resolvedCheckIntervalMs = exports.CHECK_INTERVAL_6H;
let resolvedWindows = () => electron_1.BrowserWindow.getAllWindows();
let initialized = false;
// ── Helpers ────────────────────────────────────────────────────────────────
function broadcast(payload) {
    for (const win of resolvedWindows()) {
        if (!win.isDestroyed()) {
            win.webContents.send(resolvedIpcChannel, payload);
        }
    }
}
function clearInternalTimers() {
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
function clearAutoUpdaterListeners() {
    electron_updater_1.autoUpdater.removeAllListeners("checking-for-update");
    electron_updater_1.autoUpdater.removeAllListeners("update-available");
    electron_updater_1.autoUpdater.removeAllListeners("update-not-available");
    electron_updater_1.autoUpdater.removeAllListeners("download-progress");
    electron_updater_1.autoUpdater.removeAllListeners("update-downloaded");
    electron_updater_1.autoUpdater.removeAllListeners("error");
}
function isBenignReleasesAtom404(err) {
    const message = err instanceof Error ? err.message : String(err ?? "");
    return message.includes("404") && message.includes("releases.atom");
}
function reportError(err) {
    if (resolvedSuppress404 && isBenignReleasesAtom404(err)) {
        electron_log_1.default.warn("[satellite-runtime/updater] feed indisponível (repo privado sem token); update manual requerido");
        return;
    }
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    electron_log_1.default.error("[satellite-runtime/updater] Erro:", err);
    getPrefStore().set("lastFailedUpdateAt", Date.now());
    broadcast({
        status: "error",
        error: message,
        message,
        lastFailedAt: getPrefStore().get("lastFailedUpdateAt"),
    });
    if (retryTimer)
        clearTimeout(retryTimer);
    retryTimer = setTimeout(() => {
        electron_log_1.default.info("[satellite-runtime/updater] Retry — verificando atualizações novamente...");
        void electron_updater_1.autoUpdater
            .checkForUpdates()
            .catch((e) => electron_log_1.default.warn("[satellite-runtime/updater] retry falhou:", e));
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
function setupUpdater(options = {}) {
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
    resolvedRetryMs = options.retryMs ?? exports.RETRY_24H;
    resolvedCheckIntervalMs = options.checkIntervalMs ?? exports.CHECK_INTERVAL_6H;
    resolvedWindows = options.windows ?? (() => electron_1.BrowserWindow.getAllWindows());
    electron_updater_1.autoUpdater.logger = electron_log_1.default;
    electron_updater_1.autoUpdater.autoDownload = options.autoDownload ?? true;
    electron_updater_1.autoUpdater.autoInstallOnAppQuit = options.autoInstallOnAppQuit ?? true;
    if (options.channel) {
        electron_updater_1.autoUpdater.channel = options.channel;
    }
    electron_updater_1.autoUpdater.on("checking-for-update", () => {
        electron_log_1.default.info("[satellite-runtime/updater] Verificando atualizações...");
        broadcast({ status: "checking" });
    });
    electron_updater_1.autoUpdater.on("update-available", (info) => {
        electron_log_1.default.info("[satellite-runtime/updater] Atualização disponível:", info.version);
        if (announcedRelease && announcedRelease.version !== info.version) {
            electron_log_1.default.warn(`[satellite-runtime/updater] Versão divergente: backend anunciou ${announcedRelease.version} via WS, electron-updater encontrou ${info.version}.`);
        }
        broadcast({ status: "available", version: info.version });
    });
    electron_updater_1.autoUpdater.on("update-not-available", () => {
        electron_log_1.default.info("[satellite-runtime/updater] Nenhuma atualização disponível");
        broadcast({ status: "up-to-date" });
    });
    electron_updater_1.autoUpdater.on("download-progress", (progress) => {
        broadcast({ status: "downloading", progress: progress.percent });
    });
    electron_updater_1.autoUpdater.on("update-downloaded", (info) => {
        electron_log_1.default.info("[satellite-runtime/updater] Atualização baixada:", info.version);
        if (announcedRelease) {
            if (announcedRelease.version === info.version) {
                electron_log_1.default.info(`[satellite-runtime/updater] Download bateu com release anunciada (v${info.version})`);
            }
            else {
                electron_log_1.default.warn(`[satellite-runtime/updater] Download v${info.version} NÃO bate com anúncio v${announcedRelease.version}.`);
            }
        }
        getPrefStore().set("pendingUpdateVersion", info.version);
        broadcast({ status: "downloaded", version: info.version });
    });
    electron_updater_1.autoUpdater.on("error", reportError);
    // Re-emit pending update from previous session, after small delay so the
    // renderer is ready to receive.
    const pending = getPrefStore().get("pendingUpdateVersion");
    if (pending) {
        electron_log_1.default.info(`[satellite-runtime/updater] Update ${pending} pendente de instalação (sessão anterior)`);
        pendingReemitTimer = setTimeout(() => {
            broadcast({ status: "downloaded", version: pending });
        }, 2000);
    }
    // Periodic check
    checkInterval = setInterval(() => {
        electron_log_1.default.info("[satellite-runtime/updater] Verificação periódica...");
        void electron_updater_1.autoUpdater
            .checkForUpdates()
            .catch((e) => electron_log_1.default.warn("[satellite-runtime/updater] check periódico falhou:", e));
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
async function checkForUpdates() {
    try {
        await electron_updater_1.autoUpdater.checkForUpdates();
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        electron_log_1.default.error("[satellite-runtime/updater] Erro ao verificar atualizações:", error);
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
function quitAndInstall() {
    getPrefStore().set("pendingUpdateVersion", null);
    const flags = resolvedFlags ?? { silent: true, forceRunAfter: true };
    electron_updater_1.autoUpdater.quitAndInstall(flags.silent, flags.forceRunAfter);
}
/**
 * Record a release announcement received over the satellite WebSocket
 * (Satellite Contract `app.release.published`). Same-session best-effort —
 * not persisted across restarts. Used to cross-check the version
 * `electron-updater` actually downloads against the version the backend said
 * was published.
 */
function recordAnnouncedRelease(release) {
    announcedRelease = { ...release, announcedAt: Date.now() };
    electron_log_1.default.info(`[satellite-runtime/updater] Release ${release.version} anunciada via WS — sha256=${release.sha256.slice(0, 16)}…`);
}
/**
 * Seed the runtime updater preference store with values from an external
 * source (used by satellites bridging legacy state from their own store
 * during migration to the runtime). Idempotent — only writes a key if its
 * current value is the schema default (null), so subsequent calls cannot
 * clobber explicit user/runtime writes.
 */
function primeUpdaterStore(seed) {
    const store = getPrefStore();
    if (seed.pendingUpdateVersion !== undefined &&
        seed.pendingUpdateVersion !== null &&
        store.get("pendingUpdateVersion") === null) {
        store.set("pendingUpdateVersion", seed.pendingUpdateVersion);
    }
    if (seed.lastFailedUpdateAt !== undefined &&
        seed.lastFailedUpdateAt !== null &&
        store.get("lastFailedUpdateAt") === null) {
        store.set("lastFailedUpdateAt", seed.lastFailedUpdateAt);
    }
}
/** @internal — for tests */
function _resetUpdaterForTests() {
    clearInternalTimers();
    clearAutoUpdaterListeners();
    announcedRelease = null;
    prefStore = null;
    initialized = false;
}
/** @internal — for tests */
function _isUpdaterInitialized() {
    return initialized;
}
//# sourceMappingURL=updater.js.map