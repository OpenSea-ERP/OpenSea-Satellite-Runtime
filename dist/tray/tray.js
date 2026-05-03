"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSatelliteTray = createSatelliteTray;
const electron_1 = require("electron");
function createSatelliteTray(options) {
    const tray = new electron_1.Tray(electron_1.nativeImage.createFromPath(options.iconPath));
    const tooltip = options.tooltip ?? options.appName;
    tray.setToolTip(tooltip);
    function buildMenu(custom = []) {
        const items = [];
        items.push(...custom);
        if (custom.length > 0)
            items.push({ type: "separator" });
        items.push({
            label: `Mostrar ${options.appName}`,
            click: () => options.onShow?.(),
        });
        items.push({ type: "separator" });
        items.push({
            label: "Sair",
            click: () => options.onQuit?.(),
        });
        return items;
    }
    tray.setContextMenu(electron_1.Menu.buildFromTemplate(buildMenu(options.customMenuItems)));
    tray.on("double-click", () => options.onShow?.());
    return {
        tray,
        destroy() {
            tray.destroy();
        },
        updateMenu(items) {
            tray.setContextMenu(electron_1.Menu.buildFromTemplate(items));
        },
        setTooltip(text) {
            tray.setToolTip(text);
        },
        showBalloon(title, content) {
            tray.displayBalloon({ title, content });
        },
    };
}
//# sourceMappingURL=tray.js.map