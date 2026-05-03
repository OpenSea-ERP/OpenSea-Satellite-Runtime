import { type BrowserWindow } from "electron";
export interface WindowStateDefaults {
    width: number;
    height: number;
}
export declare function restoreWindowState(win: BrowserWindow, key: string, defaults?: WindowStateDefaults): void;
/** @internal — for tests */
export declare function _resetWindowStateForTests(): void;
//# sourceMappingURL=window-state.d.ts.map