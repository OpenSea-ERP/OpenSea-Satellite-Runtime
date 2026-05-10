import { type BrowserWindow, type Rectangle, screen } from 'electron';
import ElectronStore from 'electron-store';

interface WindowStatePayload {
  x: number;
  y: number;
  width: number;
  height: number;
  maximized: boolean;
  displayBounds: Rectangle;
}

const stores = new Map<string, ElectronStore<Record<string, WindowStatePayload>>>();

function getStore(): ElectronStore<Record<string, WindowStatePayload>> {
  let s = stores.get('windowState.values');
  if (!s) {
    s = new ElectronStore<Record<string, WindowStatePayload>>({
      name: 'windowState.values',
    });
    stores.set('windowState.values', s);
  }
  return s;
}

function isDisplayConnected(bounds: Rectangle): boolean {
  const displays = screen.getAllDisplays();
  return displays.some(
    (d) =>
      d.bounds.x === bounds.x &&
      d.bounds.y === bounds.y &&
      d.bounds.width === bounds.width &&
      d.bounds.height === bounds.height,
  );
}

export interface WindowStateDefaults {
  width: number;
  height: number;
}

export function restoreWindowState(
  win: BrowserWindow,
  key: string,
  defaults: WindowStateDefaults = { width: 1280, height: 800 },
): void {
  const store = getStore();
  const saved = store.get(key);
  const primary = screen.getAllDisplays()[0]?.bounds ?? {
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
  };

  let bounds: Rectangle;
  let maximized = false;

  if (saved && isDisplayConnected(saved.displayBounds)) {
    bounds = {
      x: saved.x,
      y: saved.y,
      width: saved.width,
      height: saved.height,
    };
    maximized = saved.maximized;
  } else {
    bounds = {
      x: Math.round(primary.x + (primary.width - defaults.width) / 2),
      y: Math.round(primary.y + (primary.height - defaults.height) / 2),
      width: defaults.width,
      height: defaults.height,
    };
  }

  win.setBounds(bounds);
  if (maximized) win.maximize();

  const persist = (): void => {
    const current = win.getBounds();
    const display = screen
      .getAllDisplays()
      .find(
        (d) =>
          current.x >= d.bounds.x &&
          current.y >= d.bounds.y &&
          current.x < d.bounds.x + d.bounds.width &&
          current.y < d.bounds.y + d.bounds.height,
      );
    store.set(key, {
      x: current.x,
      y: current.y,
      width: current.width,
      height: current.height,
      maximized: win.isMaximized(),
      displayBounds: display?.bounds ?? primary,
    });
  };

  win.on('resize', persist);
  win.on('move', persist);
  win.on('maximize', persist);
  win.on('unmaximize', persist);
  win.on('close', persist);
}

/** @internal — for tests */
export function _resetWindowStateForTests(): void {
  stores.clear();
}
