"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConnectionStateBroadcaster = createConnectionStateBroadcaster;
/**
 * Narrow connection state broadcaster: holds last known status and pushes
 * it to all live BrowserWindows over IPC. Does NOT poll, derive from
 * multiple sources, or listen to WS — satellites combine `ws-client.on('state')`
 * with this broadcaster to keep the renderer in sync.
 */
const electron_1 = require("electron");
function createConnectionStateBroadcaster(options = {}) {
    const ipcChannel = options.ipcChannel ?? "connection:status";
    const resolveWindows = options.windows ?? (() => electron_1.BrowserWindow.getAllWindows());
    let current = { status: "disconnected" };
    return {
        set(payload) {
            current = { ...payload };
            for (const win of resolveWindows()) {
                if (!win.isDestroyed()) {
                    win.webContents.send(ipcChannel, current);
                }
            }
        },
        get() {
            return { ...current };
        },
    };
}
//# sourceMappingURL=connection-state.js.map