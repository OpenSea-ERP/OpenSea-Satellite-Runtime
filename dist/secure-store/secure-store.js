"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSecureStore = createSecureStore;
/**
 * Secure store wrapper over `keytar`. Per-satellite service namespace.
 *
 * In `NODE_ENV=test` automatically uses a per-process in-memory backend so
 * Playwright suites do not pollute the OS Credential Manager / Keychain
 * across runs (Emporion gold standard).
 */
const keytar_1 = __importDefault(require("keytar"));
const electron_log_1 = __importDefault(require("electron-log"));
function createSecureStore(options) {
    const isTestMode = options.testMode ?? process.env.NODE_ENV === "test";
    const memory = new Map();
    const logger = electron_log_1.default.scope(`secure-store:${options.service}`);
    return {
        async get(account) {
            if (isTestMode)
                return memory.get(account) ?? null;
            try {
                return await keytar_1.default.getPassword(options.service, account);
            }
            catch (err) {
                logger.error(`get(${account}) failed:`, err);
                return null;
            }
        },
        async set(account, value) {
            if (isTestMode) {
                memory.set(account, value);
                return;
            }
            try {
                await keytar_1.default.setPassword(options.service, account, value);
            }
            catch (err) {
                logger.error(`set(${account}) failed:`, err);
                throw err;
            }
        },
        async delete(account) {
            if (isTestMode) {
                memory.delete(account);
                return;
            }
            try {
                await keytar_1.default.deletePassword(options.service, account);
            }
            catch (err) {
                logger.error(`delete(${account}) failed:`, err);
            }
        },
    };
}
//# sourceMappingURL=secure-store.js.map