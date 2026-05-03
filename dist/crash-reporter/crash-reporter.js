"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupCrashReporter = setupCrashReporter;
exports._resetCrashReporterForTests = _resetCrashReporterForTests;
/**
 * Crash reporter wrapper over Electron's built-in `crashReporter`. Sends
 * minidumps to a configurable endpoint when the app crashes natively (V8
 * OOM, SIGSEGV, GPU process crash). Idempotent setup.
 *
 * For JS exceptions inside the main process, satellite should additionally
 * register `process.on('uncaughtException', ...)` and pipe to logs — that is
 * not what `crashReporter` covers.
 */
const electron_1 = require("electron");
const electron_log_1 = __importDefault(require("electron-log"));
let initialized = false;
function setupCrashReporter(options) {
    if (initialized) {
        electron_log_1.default.warn("[satellite-runtime/crash-reporter] setupCrashReporter already called; ignoring");
        return;
    }
    initialized = true;
    electron_1.crashReporter.start({
        submitURL: options.submitURL,
        productName: options.productName,
        companyName: options.companyName ?? "OpenSea ERP",
        uploadToServer: options.uploadToServer ?? true,
        extra: options.extra,
    });
    electron_log_1.default.info(`[satellite-runtime/crash-reporter] initialized (productName=${options.productName})`);
}
/** @internal — for tests */
function _resetCrashReporterForTests() {
    initialized = false;
}
//# sourceMappingURL=crash-reporter.js.map