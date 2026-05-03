"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerIpcChannel = registerIpcChannel;
exports.getRegisteredChannels = getRegisteredChannels;
exports._resetIpcRegistryForTests = _resetIpcRegistryForTests;
/**
 * Typed IPC channel registry. Wraps `ipcMain.handle` with a whitelist of
 * known channel names + zod payload validation. Bridges to a strongly-typed
 * surface for the renderer.
 */
const electron_1 = require("electron");
const electron_log_1 = __importDefault(require("electron-log"));
const registered = new Set();
function registerIpcChannel(def) {
    if (registered.has(def.channel)) {
        electron_log_1.default.warn(`[satellite-runtime/ipc-registry] channel "${def.channel}" already registered; skipping`);
        return;
    }
    registered.add(def.channel);
    electron_1.ipcMain.handle(def.channel, async (event, raw) => {
        if (def.payloadSchema) {
            const parsed = def.payloadSchema.safeParse(raw);
            if (!parsed.success) {
                electron_log_1.default.warn(`[satellite-runtime/ipc-registry] ${def.channel}: payload rejected — ${parsed.error.message}`);
                return {
                    ok: false,
                    error: "invalid payload",
                    details: parsed.error.message,
                };
            }
            try {
                const result = await def.handler(event, parsed.data);
                return { ok: true, data: result };
            }
            catch (err) {
                electron_log_1.default.error(`[satellite-runtime/ipc-registry] ${def.channel} threw:`, err);
                return {
                    ok: false,
                    error: err instanceof Error ? err.message : "unknown error",
                };
            }
        }
        try {
            const result = await def.handler(event, raw);
            return { ok: true, data: result };
        }
        catch (err) {
            electron_log_1.default.error(`[satellite-runtime/ipc-registry] ${def.channel} threw:`, err);
            return {
                ok: false,
                error: err instanceof Error ? err.message : "unknown error",
            };
        }
    });
}
function getRegisteredChannels() {
    return Array.from(registered);
}
/** @internal — for tests */
function _resetIpcRegistryForTests() {
    for (const c of registered)
        electron_1.ipcMain.removeHandler(c);
    registered.clear();
}
//# sourceMappingURL=ipc-registry.js.map