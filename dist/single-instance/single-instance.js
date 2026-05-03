"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureSingleInstance = ensureSingleInstance;
const electron_1 = require("electron");
function ensureSingleInstance(options = {}) {
    const isFirst = electron_1.app.requestSingleInstanceLock();
    if (!isFirst) {
        electron_1.app.quit();
        return;
    }
    electron_1.app.on("second-instance", (_event, argv, cwd) => {
        if (options.onSecondInstance) {
            options.onSecondInstance(argv, cwd);
        }
    });
}
//# sourceMappingURL=single-instance.js.map