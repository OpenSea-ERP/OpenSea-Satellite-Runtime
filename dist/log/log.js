"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupLog = setupLog;
exports.getLogger = getLogger;
exports._resetLogForTests = _resetLogForTests;
const electron_log_1 = __importDefault(require("electron-log"));
let initialized = false;
function setupLog(options) {
    if (initialized) {
        electron_log_1.default.warn("[satellite-runtime/log] setupLog already called; ignoring");
        return;
    }
    initialized = true;
    const level = options.level ?? "info";
    const maxSizeMb = options.rotation?.maxSizeMb ?? 10;
    electron_log_1.default.transports.file.level = level;
    electron_log_1.default.transports.file.format =
        "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{scope}] [{level}] {text}";
    electron_log_1.default.transports.file.maxSize = maxSizeMb * 1024 * 1024;
    electron_log_1.default.transports.console.level = level;
    electron_log_1.default.transports.console.format = "[{scope}] [{level}] {text}";
    electron_log_1.default.info(`[satellite-runtime/log] initialized (scope=${options.scope}, level=${level})`);
}
function getLogger(scopeName) {
    return electron_log_1.default.scope(scopeName);
}
/** @internal — only for tests */
function _resetLogForTests() {
    initialized = false;
}
//# sourceMappingURL=log.js.map