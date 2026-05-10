import { beforeEach, describe, expect, it, vi } from 'vitest';

const { BrowserWindowMock } = vi.hoisted(() => ({
  BrowserWindowMock: {
    getAllWindows: vi.fn(
      () =>
        [] as Array<{
          isDestroyed: () => boolean;
          webContents: { send: ReturnType<typeof vi.fn> };
        }>,
    ),
  },
}));

vi.mock('electron', () => ({ BrowserWindow: BrowserWindowMock }));

import { createConnectionStateBroadcaster } from './connection-state';

function makeWin() {
  return {
    isDestroyed: vi.fn(() => false),
    webContents: { send: vi.fn() },
  };
}

describe('connection-state broadcaster', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('default get returns disconnected', () => {
    const b = createConnectionStateBroadcaster();
    expect(b.get()).toEqual({ status: 'disconnected' });
  });

  it('set updates state and broadcasts to all live windows', () => {
    const w1 = makeWin();
    const w2 = makeWin();
    BrowserWindowMock.getAllWindows.mockReturnValue([w1, w2]);
    const b = createConnectionStateBroadcaster();
    b.set({ status: 'connected', lastConnectedAt: 12345 });
    expect(w1.webContents.send).toHaveBeenCalledWith('connection:status', {
      status: 'connected',
      lastConnectedAt: 12345,
    });
    expect(w2.webContents.send).toHaveBeenCalledWith('connection:status', expect.any(Object));
    expect(b.get()).toEqual({ status: 'connected', lastConnectedAt: 12345 });
  });

  it('skips destroyed windows', () => {
    const dead = makeWin();
    dead.isDestroyed.mockReturnValue(true);
    const live = makeWin();
    BrowserWindowMock.getAllWindows.mockReturnValue([dead, live]);
    const b = createConnectionStateBroadcaster();
    b.set({ status: 'connecting' });
    expect(dead.webContents.send).not.toHaveBeenCalled();
    expect(live.webContents.send).toHaveBeenCalled();
  });

  it('custom ipcChannel honored', () => {
    const w = makeWin();
    BrowserWindowMock.getAllWindows.mockReturnValue([w]);
    const b = createConnectionStateBroadcaster({ ipcChannel: 'x:status' });
    b.set({ status: 'error', error: 'boom' });
    expect(w.webContents.send).toHaveBeenCalledWith(
      'x:status',
      expect.objectContaining({ status: 'error' }),
    );
  });

  it('custom windows factory honored', () => {
    const w = makeWin();
    const factory = vi.fn(() => [w]);
    const b = createConnectionStateBroadcaster({ windows: factory });
    b.set({ status: 'connected' });
    expect(factory).toHaveBeenCalled();
    expect(w.webContents.send).toHaveBeenCalled();
  });

  it('get returns a copy (no shared mutation)', () => {
    const b = createConnectionStateBroadcaster();
    b.set({ status: 'connected', lastConnectedAt: 1 });
    const snap1 = b.get();
    snap1.status = 'error';
    const snap2 = b.get();
    expect(snap2.status).toBe('connected');
  });
});
