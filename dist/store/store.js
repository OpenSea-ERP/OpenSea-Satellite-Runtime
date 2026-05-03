"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStore = createStore;
const electron_store_1 = __importDefault(require("electron-store"));
const node_fs_1 = __importDefault(require("node:fs"));
const electron_log_1 = __importDefault(require("electron-log"));
function tryConstruct(options) {
    return new electron_store_1.default({
        name: options.name,
        defaults: options.defaults,
        migrations: options.migrations,
    });
}
function recoverFromCorruption(options, err) {
    const onCorruption = options.onCorruption ?? "reset";
    if (onCorruption === "throw")
        throw err;
    electron_log_1.default.error(`[satellite-runtime/store:${options.name}] corrupted store, resetting`, err);
    const errPath = err.path;
    if (errPath && node_fs_1.default.existsSync(errPath)) {
        try {
            node_fs_1.default.unlinkSync(errPath);
        }
        catch (cleanupErr) {
            electron_log_1.default.error(`[satellite-runtime/store:${options.name}] failed to unlink corrupted file`, cleanupErr);
        }
    }
    return new electron_store_1.default({
        name: options.name,
        defaults: options.defaults,
    });
}
function createStore(options) {
    // Validate the supplied defaults up front — a typo in the consumer's
    // defaults object should fail loudly here, not at first read in prod.
    const defaultsParse = options.schema.safeParse(options.defaults);
    if (!defaultsParse.success) {
        throw new Error(`[satellite-runtime/store:${options.name}] defaults fail schema validation: ${defaultsParse.error.message}`);
    }
    let electronStore;
    try {
        electronStore = tryConstruct(options);
    }
    catch (err) {
        electronStore = recoverFromCorruption(options, err);
    }
    // Validate the entire current state against the schema. If parse fails,
    // treat as corruption and reset.
    const initialParse = options.schema.safeParse(electronStore.store);
    if (!initialParse.success) {
        electron_log_1.default.error(`[satellite-runtime/store:${options.name}] schema validation failed on init: ${initialParse.error.message}`);
        electronStore = recoverFromCorruption(options, Object.assign(new Error("schema validation failed"), {
            path: electronStore.path,
        }));
        // Re-validate after recovery. If recovered state still fails, throw —
        // we cannot keep recovering in a loop and the satellite needs to know.
        const recoveredParse = options.schema.safeParse(electronStore.store);
        if (!recoveredParse.success) {
            throw new Error(`[satellite-runtime/store:${options.name}] recovered state still fails schema: ${recoveredParse.error.message}`);
        }
    }
    return {
        get(key) {
            return electronStore.get(key);
        },
        set(key, value) {
            const merged = { ...electronStore.store, [key]: value };
            const result = options.schema.safeParse(merged);
            if (!result.success) {
                throw new Error(`[satellite-runtime/store:${options.name}] schema validation failed for key="${String(key)}": ${result.error.message}`);
            }
            electronStore.set(key, value);
        },
        reset() {
            electronStore.clear();
            for (const [k, v] of Object.entries(options.defaults)) {
                electronStore.set(k, v);
            }
        },
        raw: electronStore,
    };
}
//# sourceMappingURL=store.js.map