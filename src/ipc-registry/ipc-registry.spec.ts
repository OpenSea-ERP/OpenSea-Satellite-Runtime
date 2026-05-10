import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const { ipcMainMock, logMock, handlers } = vi.hoisted(() => {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  return {
    ipcMainMock: {
      handle: vi.fn((channel: string, fn: (...args: unknown[]) => unknown) => {
        handlers.set(channel, fn);
      }),
      removeHandler: vi.fn((c: string) => handlers.delete(c)),
    },
    logMock: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
    handlers,
  };
});

vi.mock('electron', () => ({ ipcMain: ipcMainMock }));
vi.mock('electron-log', () => ({ default: logMock }));

import {
  _resetIpcRegistryForTests,
  getRegisteredChannels,
  registerIpcChannel,
} from './ipc-registry';

describe('ipc-registry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    handlers.clear();
    _resetIpcRegistryForTests();
  });

  it('registers handler with ipcMain.handle', () => {
    registerIpcChannel({ channel: 'foo', handler: () => 'ok' });
    expect(ipcMainMock.handle).toHaveBeenCalledWith('foo', expect.any(Function));
  });

  it('returns { ok: true, data } on success', async () => {
    registerIpcChannel({ channel: 'foo', handler: () => 'result' });
    const result = await handlers.get('foo')!({}, undefined);
    expect(result).toEqual({ ok: true, data: 'result' });
  });

  it('validates payload with zod schema', async () => {
    registerIpcChannel({
      channel: 'echo',
      payloadSchema: z.object({ msg: z.string() }),
      handler: (_e, payload) => payload.msg,
    });
    const ok = await handlers.get('echo')!({}, { msg: 'hi' });
    expect(ok).toEqual({ ok: true, data: 'hi' });
    const bad = (await handlers.get('echo')!({}, { msg: 123 })) as {
      ok: boolean;
    };
    expect(bad.ok).toBe(false);
  });

  it('catches handler throws and returns ok=false', async () => {
    registerIpcChannel({
      channel: 'boom',
      handler: () => {
        throw new Error('kaboom');
      },
    });
    const result = await handlers.get('boom')!({}, undefined);
    expect(result).toEqual({ ok: false, error: 'kaboom' });
  });

  it('idempotent registration (warn on duplicate)', () => {
    registerIpcChannel({ channel: 'x', handler: () => 1 });
    registerIpcChannel({ channel: 'x', handler: () => 2 });
    expect(ipcMainMock.handle).toHaveBeenCalledTimes(1);
    expect(logMock.warn).toHaveBeenCalled();
  });

  it('getRegisteredChannels reports all', () => {
    registerIpcChannel({ channel: 'a', handler: () => 1 });
    registerIpcChannel({ channel: 'b', handler: () => 2 });
    expect(getRegisteredChannels()).toEqual(expect.arrayContaining(['a', 'b']));
  });
});
