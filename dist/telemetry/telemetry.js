"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupTelemetry = setupTelemetry;
exports.stopTelemetry = stopTelemetry;
/**
 * Opt-in telemetry — collects basic device/app metrics and ships them to a
 * configurable endpoint at boot + on a daily ping. NEVER collects PII;
 * payload is `{ device_id, app_name, app_version, os, platform, locale,
 * paired_at?, last_seen, custom? }`.
 *
 * Satellites must explicitly opt-in via `setupTelemetry({ ..., enabled: true })`.
 * Default `enabled: false` — privacy-first.
 */
const electron_1 = require("electron");
const electron_log_1 = __importDefault(require("electron-log"));
const DAY_MS = 24 * 60 * 60 * 1000;
let pingTimer = null;
let initialized = false;
function buildPayload(opts) {
    const id = opts.deviceId();
    if (!id)
        return null;
    return {
        device_id: id,
        app_name: opts.appName,
        app_version: electron_1.app.getVersion(),
        os: process.platform === "win32" ? "Windows" : process.platform,
        platform: process.platform,
        locale: electron_1.app.getLocale(),
        last_seen: new Date().toISOString(),
        custom: opts.custom?.(),
    };
}
async function sendPing(opts) {
    const payload = buildPayload(opts);
    if (!payload) {
        electron_log_1.default.debug("[satellite-runtime/telemetry] no deviceId yet; skipping ping");
        return;
    }
    try {
        const fetcher = opts.fetchImpl ?? globalThis.fetch;
        if (!fetcher) {
            electron_log_1.default.warn("[satellite-runtime/telemetry] no fetch impl available; skipping ping");
            return;
        }
        const res = await fetcher(opts.endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            electron_log_1.default.warn(`[satellite-runtime/telemetry] ping responded ${res.status}`);
        }
    }
    catch (err) {
        electron_log_1.default.warn("[satellite-runtime/telemetry] ping failed:", err);
    }
}
function setupTelemetry(options) {
    if (initialized) {
        electron_log_1.default.warn("[satellite-runtime/telemetry] already initialized; ignoring");
        return;
    }
    initialized = true;
    if (!options.enabled) {
        electron_log_1.default.info("[satellite-runtime/telemetry] disabled (no opt-in)");
        return;
    }
    void sendPing(options);
    pingTimer = setInterval(() => {
        void sendPing(options);
    }, options.intervalMs ?? DAY_MS);
    electron_log_1.default.info("[satellite-runtime/telemetry] enabled");
}
function stopTelemetry() {
    if (pingTimer) {
        clearInterval(pingTimer);
        pingTimer = null;
    }
    initialized = false;
}
//# sourceMappingURL=telemetry.js.map