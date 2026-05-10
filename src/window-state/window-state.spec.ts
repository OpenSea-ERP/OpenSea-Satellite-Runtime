import { beforeEach, describe, expect, it, vi } from 'vitest';

const { memStore, screenMock } = vi.hoisted(() => ({
  memStore: new Map<string, unknown>(),
  screenMock: {
    getAllDisplays: vi.fn(() => [{ bounds: { x: 0, y: 0, width: 1920, height: 1080 } }]),
  },
}));

vi.mock('electron-store', () => ({
  default: vi.fn(() => ({
    get: (k: string) => memStore.get(k),
    set: (k: string, v: unknown) => {
      memStore.set(k, v);
    },
    clear: () => memStore.clear(),
    get store() {
      return Object.fromEntries(memStore);
    },
  })),
}));

vi.mock('electron', () => ({
  screen: screenMock,
  app: { isPackaged: true },
}));

import { _resetWindowStateForTests, restoreWindowState } from './window-state';

interface MockWin {
  setBounds: ReturnType<typeof vi.fn>;
  getBounds: ReturnType<typeof vi.fn>;
  isMaximized: ReturnType<typeof vi.fn>;
  maximize: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  handlers: Record<string, () => void>;
}

function makeWin(): MockWin {
  const handlers: Record<string, () => void> = {};
  return {
    setBounds: vi.fn(),
    getBounds: vi.fn(() => ({ x: 100, y: 100, width: 800, height: 600 })),
    isMaximized: vi.fn(() => false),
    maximize: vi.fn(),
    on: vi.fn((event: string, h: () => void) => {
      handlers[event] = h;
    }),
    handlers,
  };
}

describe('window-state', () => {
  beforeEach(() => {
    memStore.clear();
    vi.clearAllMocks();
    _resetWindowStateForTests();
    screenMock.getAllDisplays.mockReturnValue([
      { bounds: { x: 0, y: 0, width: 1920, height: 1080 } },
    ]);
  });

  it('applies defaults centered when store is empty', () => {
    const win = makeWin();
    restoreWindowState(win as never, 'main', { width: 1280, height: 720 });
    expect(win.setBounds).toHaveBeenCalledWith(
      expect.objectContaining({ width: 1280, height: 720 }),
    );
    const call = win.setBounds.mock.calls[0]?.[0];
    expect(call.x).toBe(Math.round((1920 - 1280) / 2));
    expect(call.y).toBe(Math.round((1080 - 720) / 2));
  });

  it('persists on resize', () => {
    const win = makeWin();
    restoreWindowState(win as never, 'main');
    win.handlers['resize']?.();
    expect(memStore.has('main')).toBe(true);
  });

  it('registers all expected listeners', () => {
    const win = makeWin();
    restoreWindowState(win as never, 'main');
    expect(win.on).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(win.on).toHaveBeenCalledWith('move', expect.any(Function));
    expect(win.on).toHaveBeenCalledWith('maximize', expect.any(Function));
    expect(win.on).toHaveBeenCalledWith('unmaximize', expect.any(Function));
    expect(win.on).toHaveBeenCalledWith('close', expect.any(Function));
  });

  it('restores maximize state', () => {
    memStore.set('main', {
      x: 0,
      y: 0,
      width: 800,
      height: 600,
      maximized: true,
      displayBounds: { x: 0, y: 0, width: 1920, height: 1080 },
    });
    const win = makeWin();
    restoreWindowState(win as never, 'main');
    expect(win.maximize).toHaveBeenCalled();
  });

  it('falls back to defaults when display disconnected', () => {
    memStore.set('main', {
      x: 5000,
      y: 5000,
      width: 800,
      height: 600,
      maximized: false,
      displayBounds: { x: 5000, y: 5000, width: 1024, height: 768 },
    });
    const win = makeWin();
    restoreWindowState(win as never, 'main', { width: 1280, height: 720 });
    expect(win.setBounds).toHaveBeenCalledWith(
      expect.objectContaining({ width: 1280, height: 720 }),
    );
    expect(win.maximize).not.toHaveBeenCalled();
  });
});
