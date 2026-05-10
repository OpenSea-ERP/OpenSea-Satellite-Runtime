import { beforeEach, describe, expect, it, vi } from 'vitest';

const { appMock, autoLauncherMock, logMock, electronStoreData } = vi.hoisted(() => ({
  appMock: { isPackaged: true },
  autoLauncherMock: {
    isEnabled: vi.fn().mockResolvedValue(false),
    enable: vi.fn().mockResolvedValue(undefined),
    disable: vi.fn().mockResolvedValue(undefined),
  },
  logMock: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
  electronStoreData: new Map<string, Record<string, unknown>>(),
}));

vi.mock('electron', () => ({ app: appMock }));
vi.mock('auto-launch', () => ({ default: vi.fn(() => autoLauncherMock) }));
vi.mock('electron-log', () => ({ default: logMock }));

vi.mock('electron-store', () => ({
  default: vi.fn().mockImplementation(function (
    this: unknown,
    opts: { name: string; defaults?: Record<string, unknown> },
  ) {
    let data = electronStoreData.get(opts.name);
    if (!data) {
      data = { ...(opts.defaults ?? {}) };
      electronStoreData.set(opts.name, data);
    }
    return {
      get(key: string) {
        return data[key];
      },
      set(key: string, value: unknown) {
        data[key] = value;
      },
      delete(key: string) {
        delete data[key];
      },
      clear() {
        for (const k of Object.keys(data)) delete data[k];
      },
      get store() {
        return { ...data };
      },
    };
  }),
}));

vi.mock('node:fs', () => ({
  default: { existsSync: vi.fn(() => false), unlinkSync: vi.fn() },
}));

import {
  _resetAutoLaunchForTests,
  disableAutoLaunch,
  enableAutoLaunch,
  isAutoLaunchEnabled,
  setupAutoLaunch,
  toggleAutoLaunch,
} from './auto-launch';

describe('auto-launch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appMock.isPackaged = true;
    autoLauncherMock.isEnabled.mockResolvedValue(false);
    electronStoreData.clear();
    _resetAutoLaunchForTests();
  });

  it('enable creates registry entry when packaged', async () => {
    await enableAutoLaunch('TestApp');
    expect(autoLauncherMock.enable).toHaveBeenCalled();
  });

  it('enable is no-op in dev with warn', async () => {
    appMock.isPackaged = false;
    await enableAutoLaunch('TestApp');
    expect(autoLauncherMock.enable).not.toHaveBeenCalled();
    expect(logMock.warn).toHaveBeenCalledWith(expect.stringContaining('no-op em dev'));
  });

  it('disable removes registry entry when enabled', async () => {
    autoLauncherMock.isEnabled.mockResolvedValue(true);
    await disableAutoLaunch('TestApp');
    expect(autoLauncherMock.disable).toHaveBeenCalled();
  });

  it('toggle flips state from disabled to enabled', async () => {
    autoLauncherMock.isEnabled.mockResolvedValue(false);
    const result = await toggleAutoLaunch('TestApp');
    expect(autoLauncherMock.enable).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('toggle flips state from enabled to disabled', async () => {
    autoLauncherMock.isEnabled.mockResolvedValue(true);
    const result = await toggleAutoLaunch('TestApp');
    expect(autoLauncherMock.disable).toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it('isEnabled returns false in dev', async () => {
    appMock.isPackaged = false;
    const result = await isAutoLaunchEnabled('TestApp');
    expect(result).toBe(false);
  });

  it('setup applies persisted preference (true → enable)', async () => {
    await enableAutoLaunch('PersistApp');
    autoLauncherMock.enable.mockClear();
    autoLauncherMock.isEnabled.mockResolvedValue(false);
    await setupAutoLaunch({ name: 'PersistApp' });
    expect(autoLauncherMock.enable).toHaveBeenCalled();
  });

  it('setup is no-op when preference is false (default)', async () => {
    await setupAutoLaunch({ name: 'FreshApp' });
    expect(autoLauncherMock.enable).not.toHaveBeenCalled();
  });

  it('preference persists across resets (read-back from store)', async () => {
    await enableAutoLaunch('PersistedApp');
    expect(
      electronStoreData.get('autolaunch.persistedapp'.replace('autolaunch', 'autoLaunch'))?.enabled,
    ).toBe(true);
  });
});
