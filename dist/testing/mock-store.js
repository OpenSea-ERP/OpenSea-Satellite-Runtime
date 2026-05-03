"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockStore = mockStore;
/**
 * In-memory store implementing the `SatelliteStore` shape exposed by
 * `createStore`. Uses a fresh map per instance so tests can run in parallel.
 */
function mockStore(initial) {
    let data = {
        ...initial,
    };
    const raw = {
        get(key) {
            return data[key];
        },
        set(key, value) {
            data[key] = value;
        },
        delete(key) {
            delete data[key];
        },
        clear() {
            data = {};
        },
        get store() {
            return { ...data };
        },
    };
    return {
        get(key) {
            return data[key];
        },
        set(key, value) {
            data[key] = value;
        },
        reset() {
            data = { ...initial };
        },
        raw: raw,
    };
}
//# sourceMappingURL=mock-store.js.map