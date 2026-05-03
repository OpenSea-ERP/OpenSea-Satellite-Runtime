"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockBrowserWindow = mockBrowserWindow;
const node_events_1 = require("node:events");
function mockBrowserWindow() {
    const emitter = new node_events_1.EventEmitter();
    const wcEmitter = new node_events_1.EventEmitter();
    const win = {
        bounds: { x: 0, y: 0, width: 1280, height: 800 },
        destroyed: false,
        maximized: false,
        setBounds(b) {
            Object.assign(win.bounds, b);
        },
        getBounds() {
            return { ...win.bounds };
        },
        isMaximized() {
            return win.maximized;
        },
        isMinimized() {
            return false;
        },
        maximize() {
            win.maximized = true;
        },
        unmaximize() {
            win.maximized = false;
        },
        show() { },
        hide() { },
        close() {
            emitter.emit("close");
        },
        destroy() {
            win.destroyed = true;
        },
        isDestroyed() {
            return win.destroyed;
        },
        focus() { },
        restore() { },
        on(event, handler) {
            emitter.on(event, handler);
            return win;
        },
        removeListener(event, handler) {
            emitter.removeListener(event, handler);
            return win;
        },
        emit(event, ...args) {
            return emitter.emit(event, ...args);
        },
        webContents: {
            send(_channel, ..._args) { },
            on(event, handler) {
                wcEmitter.on(event, handler);
            },
        },
    };
    return win;
}
//# sourceMappingURL=mock-browser-window.js.map