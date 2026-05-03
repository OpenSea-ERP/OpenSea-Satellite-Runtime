"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateApiUrl = migrateApiUrl;
/**
 * Helper that rewrites a stored `apiUrl` value when it matches a list of
 * known-stale URLs. Extracted from the identical `migrateStaleApiUrl()`
 * in PrintServer and Emporion. Only runs in packaged builds (so dev can
 * point at localhost without churn).
 */
const electron_1 = require("electron");
const electron_log_1 = __importDefault(require("electron-log"));
function migrateApiUrl(options) {
    if (!options.force && !electron_1.app.isPackaged)
        return;
    const fieldName = options.fieldName ?? "apiUrl";
    const staleSet = options.staleUrls instanceof Set
        ? options.staleUrls
        : new Set(options.staleUrls);
    try {
        const current = options.read();
        if (staleSet.has(current)) {
            electron_log_1.default.warn(`[satellite-runtime/migrate-api-url] ${fieldName} obsoleto (${current}); reescrevendo para ${options.canonicalUrl}`);
            options.write(options.canonicalUrl);
        }
    }
    catch (err) {
        electron_log_1.default.error(`[satellite-runtime/migrate-api-url] migration of ${fieldName} failed:`, err);
    }
}
//# sourceMappingURL=migrate-api-url.js.map