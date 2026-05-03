"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockTray = mockTray;
function mockTray() {
    const calls = {
        destroy: 0,
        setTooltip: [],
        showBalloon: [],
        updateMenu: 0,
    };
    return {
        tray: {},
        destroy() {
            calls.destroy += 1;
        },
        updateMenu(_items) {
            calls.updateMenu += 1;
        },
        setTooltip(text) {
            calls.setTooltip.push(text);
        },
        showBalloon(title, content) {
            calls.showBalloon.push({ title, content });
        },
        calls,
    };
}
//# sourceMappingURL=mock-tray.js.map