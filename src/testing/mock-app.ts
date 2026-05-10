import { EventEmitter } from 'node:events';

/**
 * Minimal `Electron.App` shape consumed by the runtime modules.
 * Strongly typed so consumers catch shape drift at compile time.
 */
export interface MockApp {
  isPackaged: boolean;
  requestSingleInstanceLock(): boolean;
  quit(): void;
  exit(code?: number): void;
  on(event: string, handler: (...args: unknown[]) => void): MockApp;
  removeListener(event: string, handler: (...args: unknown[]) => void): MockApp;
  emit(event: string, ...args: unknown[]): boolean;
  whenReady(): Promise<void>;
}

export interface MockAppOverrides {
  isPackaged?: boolean;
  lockWillBeAcquired?: boolean;
}

export function mockApp(overrides: MockAppOverrides = {}): MockApp {
  const emitter = new EventEmitter();
  const app: MockApp = {
    isPackaged: overrides.isPackaged ?? true,
    requestSingleInstanceLock() {
      return overrides.lockWillBeAcquired ?? true;
    },
    quit() {
      emitter.emit('quit');
    },
    exit(_code = 0) {
      emitter.emit('exit', _code);
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
