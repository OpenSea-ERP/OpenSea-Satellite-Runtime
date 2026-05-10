import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { appMock, logMock } = vi.hoisted(() => ({
  appMock: {
    getVersion: vi.fn(() => '1.0.0'),
    getLocale: vi.fn(() => 'pt-BR'),
  },
  logMock: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('electron', () => ({ app: appMock }));
vi.mock('electron-log', () => ({ default: logMock }));

import { setupTelemetry, stopTelemetry } from './telemetry';

describe('telemetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stopTelemetry();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    stopTelemetry();
  });

  it('disabled by default — no ping', () => {
    const fetchImpl = vi.fn();
    setupTelemetry({
      endpoint: 'https://t/',
      deviceId: () => 'd-1',
      appName: 'test',
      fetchImpl: fetchImpl as never,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('opt-in sends initial ping', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    setupTelemetry({
      endpoint: 'https://t/',
      enabled: true,
      deviceId: () => 'd-1',
      appName: 'test',
      fetchImpl: fetchImpl as never,
    });
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://t/');
    const body = JSON.parse((init as { body: string }).body);
    expect(body.device_id).toBe('d-1');
    expect(body.app_name).toBe('test');
    expect(body.app_version).toBe('1.0.0');
  });

  it('schedules daily pings', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    setupTelemetry({
      endpoint: 'https://t/',
      enabled: true,
      deviceId: () => 'd-1',
      appName: 'test',
      intervalMs: 1000,
      fetchImpl: fetchImpl as never,
    });
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1500);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('skips ping when deviceId is null', async () => {
    const fetchImpl = vi.fn();
    setupTelemetry({
      endpoint: 'https://t/',
      enabled: true,
      deviceId: () => null,
      appName: 'test',
      fetchImpl: fetchImpl as never,
    });
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('includes custom fields in payload', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    setupTelemetry({
      endpoint: 'https://t/',
      enabled: true,
      deviceId: () => 'd-1',
      appName: 'test',
      custom: () => ({ tenant: 'acme' }),
      fetchImpl: fetchImpl as never,
    });
    await vi.advanceTimersByTimeAsync(1);
    const body = JSON.parse(fetchImpl.mock.calls[0]?.[1].body);
    expect(body.custom).toEqual({ tenant: 'acme' });
  });

  it('swallows network errors', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('net'));
    expect(() =>
      setupTelemetry({
        endpoint: 'x',
        enabled: true,
        deviceId: () => 'd',
        appName: 't',
        fetchImpl: fetchImpl as never,
      }),
    ).not.toThrow();
    await vi.advanceTimersByTimeAsync(1);
  });

  it('warns on non-2xx response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    setupTelemetry({
      endpoint: 'x',
      enabled: true,
      deviceId: () => 'd',
      appName: 't',
      fetchImpl: fetchImpl as never,
    });
    await vi.advanceTimersByTimeAsync(1);
    expect(logMock.warn).toHaveBeenCalledWith(expect.stringContaining('500'));
  });

  it('idempotent setup', () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    setupTelemetry({
      endpoint: 'x',
      enabled: true,
      deviceId: () => 'd',
      appName: 't',
      fetchImpl: fetchImpl as never,
    });
    setupTelemetry({
      endpoint: 'y',
      enabled: true,
      deviceId: () => 'e',
      appName: 'u',
      fetchImpl: fetchImpl as never,
    });
    expect(logMock.warn).toHaveBeenCalledWith(expect.stringContaining('already initialized'));
  });

  it('stopTelemetry clears interval', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    setupTelemetry({
      endpoint: 'x',
      enabled: true,
      deviceId: () => 'd',
      appName: 't',
      intervalMs: 100,
      fetchImpl: fetchImpl as never,
    });
    await vi.advanceTimersByTimeAsync(1);
    stopTelemetry();
    fetchImpl.mockClear();
    await vi.advanceTimersByTimeAsync(500);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
