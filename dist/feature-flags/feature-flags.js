"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupFeatureFlags = setupFeatureFlags;
exports.stopFeatureFlags = stopFeatureFlags;
exports.isEnabled = isEnabled;
exports.getString = getString;
exports.snapshot = snapshot;
/**
 * Remote feature flags. Polls a configurable endpoint, caches values
 * in memory, exposes `isEnabled(flag)` and `getString(flag)`. Default
 * fallback values from `defaults` apply when fetch fails.
 */
const electron_log_1 = __importDefault(require("electron-log"));
let cache = {};
let pollTimer = null;
let initialized = false;
async function fetchOnce(opts) {
    const fetcher = opts.fetchImpl ?? globalThis.fetch;
    if (!fetcher) {
        electron_log_1.default.warn("[satellite-runtime/feature-flags] no fetch impl");
        return;
    }
    try {
        const headers = {};
        const auth = opts.authHeader?.();
        if (auth)
            headers["Authorization"] = auth;
        const res = await fetcher(opts.endpoint(), { headers });
        if (!res.ok) {
            electron_log_1.default.warn(`[satellite-runtime/feature-flags] fetch ${res.status}; keeping cache`);
            return;
        }
        const json = (await res.json());
        cache = { ...cache, ...json };
    }
    catch (err) {
        electron_log_1.default.warn("[satellite-runtime/feature-flags] fetch failed:", err);
    }
}
function setupFeatureFlags(options) {
    if (initialized) {
        electron_log_1.default.warn("[satellite-runtime/feature-flags] already initialized; ignoring");
        return;
    }
    initialized = true;
    cache = { ...(options.defaults ?? {}) };
    void fetchOnce(options);
    pollTimer = setInterval(() => void fetchOnce(options), options.pollIntervalMs ?? 5 * 60 * 1000);
}
function stopFeatureFlags() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
    initialized = false;
    cache = {};
}
function isEnabled(flag) {
    const v = cache[flag];
    return v === true || v === "true";
}
function getString(flag, fallback = "") {
    const v = cache[flag];
    return typeof v === "string" ? v : fallback;
}
function snapshot() {
    return { ...cache };
}
//# sourceMappingURL=feature-flags.js.map