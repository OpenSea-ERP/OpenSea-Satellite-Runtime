"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.showQuitPrompt = showQuitPrompt;
exports._resetQuitPromptForTests = _resetQuitPromptForTests;
const electron_1 = require("electron");
const electron_store_1 = __importDefault(require("electron-store"));
let store = null;
function getStore() {
    if (!store) {
        store = new electron_store_1.default({
            name: "quitPrompt.preferences",
        });
    }
    return store;
}
async function showQuitPrompt(options) {
    if (options.rememberKey) {
        const remembered = getStore().get(options.rememberKey);
        if (remembered) {
            if (remembered.choice === "minimize")
                options.onMinimize?.();
            else
                options.onQuit?.();
            return remembered.choice;
        }
    }
    const { response, checkboxChecked } = await electron_1.dialog.showMessageBox(options.win, {
        type: "question",
        buttons: ["Minimizar", "Sair"],
        defaultId: 0,
        cancelId: 0,
        title: options.appName,
        message: `O que você gostaria de fazer com o ${options.appName}?`,
        detail: "Minimizar mantém o app rodando na bandeja do sistema. Sair fecha o app completamente.",
        checkboxLabel: "Lembrar minha escolha",
        checkboxChecked: false,
    });
    const choice = response === 0 ? "minimize" : "quit";
    if (options.rememberKey && checkboxChecked) {
        getStore().set(options.rememberKey, { choice });
    }
    if (choice === "minimize")
        options.onMinimize?.();
    else
        options.onQuit?.();
    return choice;
}
/** @internal */
function _resetQuitPromptForTests() {
    store = null;
}
//# sourceMappingURL=quit-prompt.js.map