"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSplashWindow = createSplashWindow;
const electron_1 = require("electron");
function htmlFor(appName) {
    return `<!doctype html>
<html><head><meta charset="utf-8"/><style>
  body { margin: 0; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #1f2937; color: #f9fafb; font-family: system-ui, -apple-system, sans-serif; border-radius: 12px; }
  .name { font-size: 18px; font-weight: 600; margin-top: 12px; }
  .spinner { width: 32px; height: 32px; border: 3px solid #374151; border-top-color: #60a5fa; border-radius: 50%; animation: spin 0.8s linear infinite; margin-top: 24px; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style></head><body><div class="name">${appName}</div><div class="spinner"></div></body></html>`;
}
function createSplashWindow(options) {
    const win = new electron_1.BrowserWindow({
        width: options.width ?? 360,
        height: options.height ?? 240,
        frame: false,
        resizable: false,
        movable: false,
        center: true,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        show: true,
        webPreferences: { nodeIntegration: false, contextIsolation: true },
    });
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlFor(options.appName))}`);
    return {
        window: win,
        close() {
            if (!win.isDestroyed())
                win.destroy();
        },
    };
}
//# sourceMappingURL=splash.js.map