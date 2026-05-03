/**
 * Kiosk-mode helper. Configures a `BrowserWindow` for kiosk operation:
 * full-screen, no menu bar, no dev-tools, no zoom shortcuts. Useful for
 * Horus (biometric clock) and Emporion when deployed as locked-down POS.
 *
 * Apply BEFORE the window loads its content.
 */
import { Menu, type BrowserWindow } from "electron";

export interface KioskOptions {
  /** Disable Ctrl/Cmd-shortcut zoom. Default true. */
  disableZoom?: boolean;
  /** Disable F12/Ctrl+Shift+I dev tools. Default true (only in packaged). */
  disableDevTools?: boolean;
  /** Set to true to disable global app menu. Default true. */
  disableAppMenu?: boolean;
}

export function enterKioskMode(
  win: BrowserWindow,
  options: KioskOptions = {},
): void {
  const disableZoom = options.disableZoom ?? true;
  const disableDevTools = options.disableDevTools ?? true;
  const disableAppMenu = options.disableAppMenu ?? true;

  win.setKiosk(true);
  win.setMenuBarVisibility(false);
  win.setAutoHideMenuBar(true);

  if (disableAppMenu) {
    Menu.setApplicationMenu(null);
  }

  if (disableZoom) {
    const wc = win.webContents;
    wc.setZoomFactor(1);
    wc.setVisualZoomLevelLimits(1, 1);
    wc.on("before-input-event", (event, input) => {
      const ctrl = input.control || input.meta;
      if (ctrl && ["+", "-", "=", "0"].includes(input.key)) {
        event.preventDefault();
      }
    });
  }

  if (disableDevTools) {
    const wc = win.webContents;
    wc.on("before-input-event", (event, input) => {
      const ctrl = input.control || input.meta;
      const shift = input.shift;
      if (input.key === "F12") event.preventDefault();
      if (ctrl && shift && (input.key === "I" || input.key === "i")) {
        event.preventDefault();
      }
    });
  }
}

export function exitKioskMode(win: BrowserWindow): void {
  win.setKiosk(false);
  win.setMenuBarVisibility(true);
  win.setAutoHideMenuBar(false);
}
