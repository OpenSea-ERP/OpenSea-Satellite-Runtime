"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerShutdownHandler = registerShutdownHandler;
exports.runShutdownHandlers = runShutdownHandlers;
exports._resetShutdownForTests = _resetShutdownForTests;
const electron_log_1 = __importDefault(require("electron-log"));
const handlers = [];
let shutdownPromise = null;
function registerShutdownHandler(fn, options = {}) {
    handlers.push({
        fn,
        name: options.name ?? `handler-${handlers.length}`,
        timeoutMs: options.timeoutMs ?? 5000,
    });
}
async function runWithTimeout(h) {
    return new Promise((resolve) => {
        let settled = false;
        const timer = setTimeout(() => {
            if (!settled) {
                settled = true;
                electron_log_1.default.error(`[satellite-runtime/shutdown] handler "${h.name}" timed out after ${h.timeoutMs}ms`);
                resolve();
            }
        }, h.timeoutMs);
        Promise.resolve()
            .then(() => h.fn())
            .then(() => {
            if (!settled) {
                settled = true;
                clearTimeout(timer);
                resolve();
            }
        })
            .catch((err) => {
            if (!settled) {
                settled = true;
                clearTimeout(timer);
                electron_log_1.default.error(`[satellite-runtime/shutdown] handler "${h.name}" failed:`, err);
                resolve();
            }
        });
    });
}
/**
 * Run all registered shutdown handlers in parallel. Idempotent (returns the
 * same in-flight promise on repeated calls).
 */
function runShutdownHandlers() {
    if (shutdownPromise)
        return shutdownPromise;
    shutdownPromise = (async () => {
        electron_log_1.default.info(`[satellite-runtime/shutdown] running ${handlers.length} handlers`);
        await Promise.all(handlers.map(runWithTimeout));
        electron_log_1.default.info("[satellite-runtime/shutdown] all handlers completed");
    })();
    return shutdownPromise;
}
/** @internal */
function _resetShutdownForTests() {
    handlers.length = 0;
    shutdownPromise = null;
}
//# sourceMappingURL=graceful-shutdown.js.map