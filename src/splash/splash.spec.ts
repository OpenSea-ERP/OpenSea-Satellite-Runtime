import { beforeEach, describe, expect, it, vi } from 'vitest';

const { winInstance, BrowserWindowCtor } = vi.hoisted(() => {
  const winInstance = {
    loadURL: vi.fn(),
    show: vi.fn(),
    close: vi.fn(),
    destroy: vi.fn(),
    isDestroyed: vi.fn(() => false),
  };
  return { winInstance, BrowserWindowCtor: vi.fn(() => winInstance) };
});

vi.mock('electron', () => ({
  BrowserWindow: BrowserWindowCtor,
  app: { isPackaged: true },
}));

import { createSplashWindow } from './splash';

describe('splash', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    winInstance.isDestroyed.mockReturnValue(false);
  });

  it('creates a frameless centered window', () => {
    const handle = createSplashWindow({
      iconPath: '/icon.png',
      appName: 'TestApp',
    });
    expect(BrowserWindowCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        frame: false,
        center: true,
        skipTaskbar: true,
      }),
    );
    expect(handle.window).toBe(winInstance);
  });

  it('loads a data URL containing the app name', () => {
    createSplashWindow({ iconPath: '/icon.png', appName: 'MyApp' });
    expect(winInstance.loadURL).toHaveBeenCalled();
    const url = winInstance.loadURL.mock.calls[0]?.[0] as string;
    expect(decodeURIComponent(url)).toContain('MyApp');
  });

  it('respects custom width/height', () => {
    createSplashWindow({
      iconPath: '/icon.png',
      appName: 'TestApp',
      width: 480,
      height: 320,
    });
    expect(BrowserWindowCtor).toHaveBeenCalledWith(
      expect.objectContaining({ width: 480, height: 320 }),
    );
  });

  it('close destroys the window', () => {
    const handle = createSplashWindow({
      iconPath: '/icon.png',
      appName: 'TestApp',
    });
    handle.close();
    expect(winInstance.destroy).toHaveBeenCalled();
  });

  it('close is idempotent on already-destroyed window', () => {
    const handle = createSplashWindow({
      iconPath: '/icon.png',
      appName: 'TestApp',
    });
    winInstance.isDestroyed.mockReturnValue(true);
    handle.close();
    expect(winInstance.destroy).not.toHaveBeenCalled();
  });
});
