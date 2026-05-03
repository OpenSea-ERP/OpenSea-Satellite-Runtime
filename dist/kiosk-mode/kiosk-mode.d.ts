/**
 * Kiosk-mode helper. Configures a `BrowserWindow` for kiosk operation:
 * full-screen, no menu bar, no dev-tools, no zoom shortcuts. Useful for
 * Horus (biometric clock) and Emporion when deployed as locked-down POS.
 *
 * Apply BEFORE the window loads its content.
 */
import { type BrowserWindow } from "electron";
export interface KioskOptions {
    /** Disable Ctrl/Cmd-shortcut zoom. Default true. */
    disableZoom?: boolean;
    /** Disable F12/Ctrl+Shift+I dev tools. Default true (only in packaged). */
    disableDevTools?: boolean;
    /** Set to true to disable global app menu. Default true. */
    disableAppMenu?: boolean;
}
export declare function enterKioskMode(win: BrowserWindow, options?: KioskOptions): void;
export declare function exitKioskMode(win: BrowserWindow): void;
//# sourceMappingURL=kiosk-mode.d.ts.map