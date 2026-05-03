"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockApp = mockApp;
const node_events_1 = require("node:events");
function mockApp(overrides = {}) {
    const emitter = new node_events_1.EventEmitter();
    const app = {
        isPackaged: overrides.isPackaged ?? true,
        requestSingleInstanceLock() {
            return overrides.lockWillBeAcquired ?? true;
        },
        quit() {
            emitter.emit("quit");
        },
        exit(_code = 0) {
            emitter.emit("exit", _code);
        },
        on(event, handler) {
            emitter.on(event, handler);
            return app;
        },
        removeListener(event, handler) {
            emitter.removeListener(event, handler);
            return app;
        },
        emit(event, ...args) {
            return emitter.emit(event, ...args);
        },
        whenReady() {
            return Promise.resolve();
        },
    };
    return app;
}
//# sourceMappingURL=mock-app.js.map