"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupAutoLaunch = setupAutoLaunch;
exports.isAutoLaunchEnabled = isAutoLaunchEnabled;
exports.enableAutoLaunch = enableAutoLaunch;
exports.disableAutoLaunch = disableAutoLaunch;
exports.toggleAutoLaunch = toggleAutoLaunch;
exports._resetAutoLaunchForTests = _resetAutoLaunchForTests;
const auto_launch_1 = __importDefault(require("auto-launch"));
const electron_1 = require("electron");
const electron_log_1 = __importDefault(require("electron-log"));
const zod_1 = require("zod");
const store_1 = require("../store/store");
const prefSchema = zod_1.z.object({ enabled: zod_1.z.boolean() });
const prefStores = new Map();
const launchers = new Map();
function namespace(appName) {
    return `autoLaunch.${appName.replace(/\s+/g, "-").toLowerCase()}`;
}
function getPrefStore(appName) {
    let s = prefStores.get(appName);
    if (!s) {
        s = (0, store_1.createStore)({
            name: namespace(appName),
            schema: prefSchema,
            defaults: { enabled: false },
        });
        prefStores.set(appName, s);
    }
    return s;
}
function getLauncher(name, isHidden = true) {
    let l = launchers.get(name);
    if (!l) {
        l = new auto_launch_1.default({ name, isHidden });
        launchers.set(name, l);
    }
    return l;
}
function devGuard(action) {
    if (!electron_1.app.isPackaged) {
        electron_log_1.default.warn(`[satellite-runtime/auto-launch] ${action} no-op em dev (app.isPackaged=false)`);
        return true;
    }
    return false;
}
async function setupAutoLaunch(options) {
    if (devGuard("setup"))
        return;
    const wanted = getPrefStore(options.name).get("enabled");
    if (wanted) {
        await enableAutoLaunch(options.name, options.isHidden);
    }
}
async function isAutoLaunchEnabled(name) {
    if (devGuard("isEnabled"))
        return false;
    try {
        return await getLauncher(name).isEnabled();
    }
    catch (err) {
        electron_log_1.default.error("[satellite-runtime/auto-launch] isEnabled failed:", err);
        return false;
    }
}
async function enableAutoLaunch(name, isHidden = true) {
    if (devGuard("enable"))
        return;
    try {
        const l = getLauncher(name, isHidden);
        const enabled = await l.isEnabled();
        if (!enabled)
            await l.enable();
        getPrefStore(name).set("enabled", true);
        electron_log_1.default.info(`[satellite-runtime/auto-launch] enabled (${name})`);
    }
    catch (err) {
        electron_log_1.default.error("[satellite-runtime/auto-launch] enable failed:", err);
        throw err;
    }
}
async function disableAutoLaunch(name) {
    if (devGuard("disable"))
        return;
    try {
        const l = getLauncher(name);
        const enabled = await l.isEnabled();
        if (enabled)
            await l.disable();
        getPrefStore(name).set("enabled", false);
        electron_log_1.default.info(`[satellite-runtime/auto-launch] disabled (${name})`);
    }
    catch (err) {
        electron_log_1.default.error("[satellite-runtime/auto-launch] disable failed:", err);
        throw err;
    }
}
async function toggleAutoLaunch(name, isHidden = true) {
    if (devGuard("toggle"))
        return false;
    const enabled = await isAutoLaunchEnabled(name);
    if (enabled) {
        await disableAutoLaunch(name);
        return false;
    }
    await enableAutoLaunch(name, isHidden);
    return true;
}
/** @internal — for tests */
function _resetAutoLaunchForTests() {
    prefStores.clear();
    launchers.clear();
}
//# sourceMappingURL=auto-launch.js.map