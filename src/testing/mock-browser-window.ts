import { EventEmitter } from 'node:events';

/**
 * Minimal `BrowserWindow` shape consumed by the runtime modules. Strongly
 * typed so consumers catch shape drift at compile time. Uses an internal
 * `EventEmitter` for realistic on/removeListener semantics.
 */
export interface MockBrowserWindow {
  bounds: { x: number; y: number; width: number; height: number };
  destroyed: boolean;
  maximized: boolean;
  setBounds(b: { x?: number; y?: number; width?: number; height?: number }): void;
  getBounds(): { x: number; y: number; width: number; height: number };
  isMaximized(): boolean;
  isMinimized(): boolean;
  maximize(): void;
  unmaximize(): void;
  show(): void;
  hide(): void;
  close(): void;
  destroy(): void;
  isDestroyed(): boolean;
  focus(): void;
  restore(): void;
  on(event: string, handler: (...args: unknown[]) => void): MockBrowserWindow;
  removeListener(event: string, handler: (...args: unknown[]) => void): MockBrowserWindow;
  emit(event: string, ...args: unknown[]): boolean;
  webContents: {
    send(channel: string, ...args: unknown[]): void;
    on(event: string, handler: (...args: unknown[]) => void): void;
  };
}

export function mockBrowserWindow(): MockBrowserWindow {
  const emitter = new EventEmitter();
  const wcEmitter = new EventEmitter();
  const win: MockBrowserWindow = {
    bounds: { x: 0, y: 0, width: 1280, height: 800 },
    destroyed: false,
    maximized: false,
    setBounds(b) {
      Object.assign(win.bounds, b);
    },
    getBounds() {
      return { ...win.bounds };
    },
    isMaximized() {
      return win.maximized;
    },
    isMinimized() {
      return false;
    },
    maximize() {
      win.maximized = true;
    },
    unmaximize() {
      win.maximized = false;
    },
    show() {},
    hide() {},
    close() {
      emitter.emit('close');
    },
    destroy() {
      win.destroyed = true;
    },
    isDestroyed() {
      return win.destroyed;
    },
    focus() {},
    restore() {},
    on(event, handler) {
      emitter.on(event, handler);
      return win;
    },
    removeListener(event, handler) {
      emitter.removeListener(event, handler);
      return win;
    },
    emit(event, ...args) {
      return emitter.emit(event, ...args);
    },
    webContents: {
      send(_channel: string, ..._args: unknown[]) {},
      on(event, handler) {
        wcEmitter.on(event, handler);
      },
    },
  };
  return win;
}
