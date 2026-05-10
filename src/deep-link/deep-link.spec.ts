import { beforeEach, describe, expect, it, vi } from 'vitest';

const { appMock, logMock } = vi.hoisted(() => ({
  appMock: {
    setAsDefaultProtocolClient: vi.fn(),
    on: vi.fn(),
  },
  logMock: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('electron', () => ({ app: appMock }));
vi.mock('electron-log', () => ({ default: logMock }));

import { registerDeepLink } from './deep-link';

describe('deep-link', () => {
  const originalArgv = process.argv;

  beforeEach(() => {
    vi.clearAllMocks();
    process.argv = ['electron'];
  });
  afterAll: () => {
    process.argv = originalArgv;
  };

  it('registers protocol via app.setAsDefaultProtocolClient', () => {
    registerDeepLink({ protocol: 'opensea', onUrl: vi.fn() });
    expect(appMock.setAsDefaultProtocolClient).toHaveBeenCalledWith('opensea');
  });

  it('registers open-url and second-instance listeners', () => {
    registerDeepLink({ protocol: 'opensea', onUrl: vi.fn() });
    expect(appMock.on).toHaveBeenCalledWith('open-url', expect.any(Function));
    expect(appMock.on).toHaveBeenCalledWith('second-instance', expect.any(Function));
  });

  it('open-url handler dispatches to onUrl', () => {
    const onUrl = vi.fn();
    registerDeepLink({ protocol: 'opensea', onUrl });
    const handler = appMock.on.mock.calls.find((c) => c[0] === 'open-url')?.[1] as (
      e: { preventDefault: () => void },
      url: string,
    ) => void;
    handler({ preventDefault: vi.fn() }, 'opensea://pair?token=abc');
    expect(onUrl).toHaveBeenCalledWith('opensea://pair?token=abc');
  });

  it('second-instance picks URL from argv', () => {
    const onUrl = vi.fn();
    registerDeepLink({ protocol: 'opensea', onUrl });
    const handler = appMock.on.mock.calls.find((c) => c[0] === 'second-instance')?.[1] as (
      e: unknown,
      argv: string[],
    ) => void;
    handler(null, ['electron', '--flag', 'opensea://hello']);
    expect(onUrl).toHaveBeenCalledWith('opensea://hello');
  });

  it('second-instance ignores when no matching URL', () => {
    const onUrl = vi.fn();
    registerDeepLink({ protocol: 'opensea', onUrl });
    const handler = appMock.on.mock.calls.find((c) => c[0] === 'second-instance')?.[1] as (
      e: unknown,
      argv: string[],
    ) => void;
    handler(null, ['electron', '--flag']);
    expect(onUrl).not.toHaveBeenCalled();
  });

  it('initial argv URL is dispatched on registration', () => {
    process.argv = ['electron', 'opensea://launch'];
    const onUrl = vi.fn();
    registerDeepLink({ protocol: 'opensea', onUrl });
    expect(onUrl).toHaveBeenCalledWith('opensea://launch');
  });

  it('onUrl throw is swallowed', () => {
    const onUrl = vi.fn(() => {
      throw new Error('boom');
    });
    expect(() => registerDeepLink({ protocol: 'opensea', onUrl })).not.toThrow();
  });
});
