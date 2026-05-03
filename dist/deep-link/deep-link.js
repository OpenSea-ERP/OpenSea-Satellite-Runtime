"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDeepLink = registerDeepLink;
/**
 * Deep-link helper. Registers a custom protocol (`opensea://`) with the OS
 * and dispatches incoming URLs to a handler. On Windows, registers via
 * `app.setAsDefaultProtocolClient` and listens for `second-instance`
 * (URL is in argv). On macOS, listens for `open-url`. On Linux, requires
 * `.desktop` file (out of scope here).
 *
 * Call from main process during boot.
 */
const electron_1 = require("electron");
const electron_log_1 = __importDefault(require("electron-log"));
function registerDeepLink(options) {
    const { protocol, onUrl } = options;
    if (process.defaultApp) {
        if (process.argv.length >= 2) {
            electron_1.app.setAsDefaultProtocolClient(protocol, process.execPath, [
                process.argv[1],
            ]);
        }
    }
    else {
        electron_1.app.setAsDefaultProtocolClient(protocol);
    }
    // macOS: open-url
    electron_1.app.on("open-url", (event, url) => {
        event.preventDefault();
        electron_log_1.default.info(`[satellite-runtime/deep-link] open-url received: ${url.slice(0, 100)}`);
        try {
            onUrl(url);
        }
        catch (err) {
            electron_log_1.default.error("[satellite-runtime/deep-link] onUrl threw:", err);
        }
    });
    // Windows/Linux: second-instance carries the URL in argv
    electron_1.app.on("second-instance", (_event, argv) => {
        const url = argv.find((arg) => arg.startsWith(`${protocol}://`));
        if (url) {
            electron_log_1.default.info(`[satellite-runtime/deep-link] second-instance URL received: ${url.slice(0, 100)}`);
            try {
                onUrl(url);
            }
            catch (err) {
                electron_log_1.default.error("[satellite-runtime/deep-link] onUrl threw:", err);
            }
        }
    });
    // First-launch URL (Windows): protocol activation passes URL in argv.
    const initialUrl = process.argv.find((arg) => arg.startsWith(`${protocol}://`));
    if (initialUrl) {
        electron_log_1.default.info(`[satellite-runtime/deep-link] initial URL: ${initialUrl.slice(0, 100)}`);
        try {
            onUrl(initialUrl);
        }
        catch (err) {
            electron_log_1.default.error("[satellite-runtime/deep-link] onUrl threw on initial:", err);
        }
    }
}
//# sourceMappingURL=deep-link.js.map