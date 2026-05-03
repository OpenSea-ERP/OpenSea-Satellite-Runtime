"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.restoreWindowState = restoreWindowState;
exports._resetWindowStateForTests = _resetWindowStateForTests;
const electron_1 = require("electron");
const electron_store_1 = __importDefault(require("electron-store"));
const stores = new Map();
function getStore() {
    let s = stores.get("windowState.values");
    if (!s) {
        s = new electron_store_1.default({
            name: "windowState.values",
        });
        stores.set("windowState.values", s);
    }
    return s;
}
function isDisplayConnected(bounds) {
    const displays = electron_1.screen.getAllDisplays();
    return displays.some((d) => d.bounds.x === bounds.x &&
        d.bounds.y === bounds.y &&
        d.bounds.width === bounds.width &&
        d.bounds.height === bounds.height);
}
function restoreWindowState(win, key, defaults = { width: 1280, height: 800 }) {
    const store = getStore();
    const saved = store.get(key);
    const primary = electron_1.screen.getAllDisplays()[0]?.bounds ?? {
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
    };
    let bounds;
    let maximized = false;
    if (saved && isDisplayConnected(saved.displayBounds)) {
        bounds = {
            x: saved.x,
            y: saved.y,
            width: saved.width,
            height: saved.height,
        };
        maximized = saved.maximized;
    }
    else {
        bounds = {
            x: Math.round(primary.x + (primary.width - defaults.width) / 2),
            y: Math.round(primary.y + (primary.height - defaults.height) / 2),
            width: defaults.width,
            height: defaults.height,
        };
    }
    win.setBounds(bounds);
    if (maximized)
        win.maximize();
    const persist = () => {
        const current = win.getBounds();
        const display = electron_1.screen
            .getAllDisplays()
            .find((d) => current.x >= d.bounds.x &&
            current.y >= d.bounds.y &&
            current.x < d.bounds.x + d.bounds.width &&
            current.y < d.bounds.y + d.bounds.height);
        store.set(key, {
            x: current.x,
            y: current.y,
            width: current.width,
            height: current.height,
            maximized: win.isMaximized(),
            displayBounds: display?.bounds ?? primary,
        });
    };
    win.on("resize", persist);
    win.on("move", persist);
    win.on("maximize", persist);
    win.on("unmaximize", persist);
    win.on("close", persist);
}
/** @internal — for tests */
function _resetWindowStateForTests() {
    stores.clear();
}
//# sourceMappingURL=window-state.js.map