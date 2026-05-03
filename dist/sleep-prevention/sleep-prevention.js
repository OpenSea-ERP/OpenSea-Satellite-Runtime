"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSleepPrevention = startSleepPrevention;
exports.stopSleepPrevention = stopSleepPrevention;
exports.isSleepPreventionActive = isSleepPreventionActive;
exports._resetSleepPreventionForTests = _resetSleepPreventionForTests;
/**
 * Sleep prevention via Electron's `powerSaveBlocker`. Useful for kiosk POS
 * (Emporion) and biometric clock (Horus) where the screen must stay on.
 *
 * `start()` is idempotent within a single satellite — only one block is
 * held at a time per process; subsequent starts are no-ops.
 */
const electron_1 = require("electron");
const electron_log_1 = __importDefault(require("electron-log"));
let blockerId = null;
function startSleepPrevention(type = "prevent-display-sleep") {
    if (blockerId !== null && electron_1.powerSaveBlocker.isStarted(blockerId)) {
        electron_log_1.default.warn("[satellite-runtime/sleep-prevention] already started; ignoring");
        return true;
    }
    blockerId = electron_1.powerSaveBlocker.start(type);
    electron_log_1.default.info(`[satellite-runtime/sleep-prevention] started (id=${blockerId}, type=${type})`);
    return true;
}
function stopSleepPrevention() {
    if (blockerId === null)
        return;
    if (electron_1.powerSaveBlocker.isStarted(blockerId)) {
        electron_1.powerSaveBlocker.stop(blockerId);
        electron_log_1.default.info(`[satellite-runtime/sleep-prevention] stopped (id=${blockerId})`);
    }
    blockerId = null;
}
function isSleepPreventionActive() {
    return blockerId !== null && electron_1.powerSaveBlocker.isStarted(blockerId);
}
/** @internal — for tests */
function _resetSleepPreventionForTests() {
    blockerId = null;
}
//# sourceMappingURL=sleep-prevention.js.map