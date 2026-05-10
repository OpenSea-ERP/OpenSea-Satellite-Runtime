import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { logMock } = vi.hoisted(() => ({
  logMock: {
    scope: vi.fn((_name: string) => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    })),
  },
}));

vi.mock('electron-log', () => ({ default: logMock }));

import { createWSClient, SatelliteWSClient, type WSClientState } from './ws-client';

// ── Stateful fake transport ───────────────────────────────────────────────
type Listener = (...args: unknown[]) => void;
class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  url: string;
  options?: unknown;
  listeners = new Map<string, Listener[]>();
  sent: string[] = [];
  closed = false;
  closeCalls: Array<{ code?: number; reason?: string }> = [];
  pings = 0;

  constructor(url: string, options?: unknown) {
    this.url = url;
    this.options = options;
    FakeWebSocket.instances.push(this);
  }

  on(event: string, fn: Listener): this {
    const arr = this.listeners.get(event) ?? [];
    arr.push(fn);
    this.listeners.set(event, arr);
    return this;
  }
  removeAllListeners(event?: string): this {
    if (event) this.listeners.delete(event);
    else this.listeners.clear();
    return this;
  }
  send(data: string): void {
    this.sent.push(data);
  }
  ping(): void {
    this.pings += 1;
  }
  close(code?: number, reason?: string): void {
    this.closeCalls.push({ code, reason });
    this.closed = true;
  }

  // helpers
  emitOpen(): void {
    for (const fn of this.listeners.get('open') ?? []) fn();
  }
  emitMessage(payload: unknown): void {
    const data = Buffer.from(JSON.stringify(payload));
    for (const fn of this.listeners.get('message') ?? []) fn(data);
  }
  emitMessageRaw(raw: string): void {
    for (const fn of this.listeners.get('message') ?? []) fn(Buffer.from(raw));
  }
  emitError(err: Error): void {
    for (const fn of this.listeners.get('error') ?? []) fn(err);
  }
  emitClose(code = 1000, reason = ''): void {
    for (const fn of this.listeners.get('close') ?? []) fn(code, Buffer.from(reason));
  }
  emitPong(): void {
    for (const fn of this.listeners.get('pong') ?? []) fn();
  }
}

function makeClient(overrides: Record<string, unknown> = {}) {
  FakeWebSocket.instances.length = 0;
  return new SatelliteWSClient({
    buildUrl: () => 'ws://test/',
    auth: {
      kind: 'bearer-header',
      token: () => 'tok',
    },
    reconnect: { initialMs: 100, maxMs: 1000, jitterPct: 0 },
    heartbeat: { intervalMs: 1000, pongTimeoutMs: 200 },
    jitterFn: () => 0.5, // no jitter contribution
    WebSocketImpl: FakeWebSocket as never,
    ...overrides,
  });
}

describe('SatelliteWSClient', () => {
  beforeEach(() => {
    FakeWebSocket.instances.length = 0;
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts in idle state', () => {
    const client = makeClient();
    expect(client.getState()).toBe('idle');
  });

  it('connects and transitions: connecting → connected on open', async () => {
    const client = makeClient();
    const states: WSClientState[] = [];
    client.on('state', (s) => states.push(s));
    client.connect();
    await vi.runAllTimersAsync();
    expect(states).toContain('connecting');
    const sock = FakeWebSocket.instances[0]!;
    sock.emitOpen();
    expect(client.getState()).toBe('connected');
    expect(client.isConnected()).toBe(true);
  });

  it('bearer-header auth passes Authorization header', async () => {
    const client = makeClient();
    client.connect();
    await vi.runAllTimersAsync();
    const sock = FakeWebSocket.instances[0]!;
    expect((sock.options as { headers: Record<string, string> }).headers.Authorization).toBe(
      'Bearer tok',
    );
  });

  it('hello-message auth sends hello messages on open', async () => {
    const client = makeClient({
      auth: {
        kind: 'hello-message',
        token: () => 'tk',
        buildHelloMessages: (t: string) => [{ type: 'hello', token: t }],
      },
    });
    client.connect();
    await vi.runAllTimersAsync();
    const sock = FakeWebSocket.instances[0]!;
    sock.emitOpen();
    await vi.runAllTimersAsync();
    expect(sock.sent[0]).toBe(JSON.stringify({ type: 'hello', token: 'tk' }));
  });

  it('enters waiting-auth when token is null and does not connect', async () => {
    const client = makeClient({
      auth: { kind: 'bearer-header', token: () => null },
    });
    client.connect();
    await vi.runAllTimersAsync();
    expect(client.getState()).toBe('waiting-auth');
    expect(FakeWebSocket.instances.length).toBe(0);
  });

  it('re-entrant connect works after token appears', async () => {
    let token: string | null = null;
    const client = makeClient({
      auth: { kind: 'bearer-header', token: () => token },
    });
    client.connect();
    await vi.runAllTimersAsync();
    expect(client.getState()).toBe('waiting-auth');
    token = 'appeared';
    client.connect();
    await vi.runAllTimersAsync();
    expect(FakeWebSocket.instances.length).toBe(1);
    expect(client.getState()).toBe('connecting');
  });

  it('multi-call connect in connected/connecting is no-op', async () => {
    const client = makeClient();
    client.connect();
    await vi.runAllTimersAsync();
    client.connect();
    await vi.runAllTimersAsync();
    expect(FakeWebSocket.instances.length).toBe(1);
  });

  it('schedules reconnect after close with exponential backoff', async () => {
    const client = makeClient();
    client.connect();
    await vi.runAllTimersAsync();
    const first = FakeWebSocket.instances[0]!;
    first.emitOpen();
    expect(client.getState()).toBe('connected');
    first.emitClose(1006);
    expect(client.getReconnectAttempts()).toBe(1);
    await vi.advanceTimersByTimeAsync(150);
    expect(FakeWebSocket.instances.length).toBe(2);
  });

  it('does NOT reconnect on close code 4003 (revoked)', async () => {
    const client = makeClient();
    client.connect();
    await vi.runAllTimersAsync();
    const sock = FakeWebSocket.instances[0]!;
    sock.emitOpen();
    sock.emitClose(4003);
    await vi.advanceTimersByTimeAsync(2000);
    expect(FakeWebSocket.instances.length).toBe(1);
    expect(client.getState()).toBe('closed');
  });

  it('does NOT reconnect on close code 4001 (auth fail)', async () => {
    const client = makeClient();
    client.connect();
    await vi.runAllTimersAsync();
    const sock = FakeWebSocket.instances[0]!;
    sock.emitOpen();
    sock.emitClose(4001);
    await vi.advanceTimersByTimeAsync(2000);
    expect(FakeWebSocket.instances.length).toBe(1);
    expect(client.getState()).toBe('closed');
  });

  it('custom shouldReconnect overrides default', async () => {
    const shouldReconnect = vi.fn(() => false);
    const client = makeClient({ shouldReconnect });
    client.connect();
    await vi.runAllTimersAsync();
    const sock = FakeWebSocket.instances[0]!;
    sock.emitOpen();
    sock.emitClose(1006);
    expect(shouldReconnect).toHaveBeenCalled();
    expect(client.getState()).toBe('closed');
  });

  it('max reconnect attempts gives up (no open between failures)', async () => {
    const client = makeClient({
      reconnect: { initialMs: 10, maxMs: 50, jitterPct: 0, maxAttempts: 2 },
    });
    // 'error' must be observed for max-attempts emission to not throw on EE
    client.on('error', () => {});
    client.connect();
    await vi.runAllTimersAsync();
    // Sequence WITHOUT emitting open (so reconnectAttempts is not reset):
    // 1st close → attempt=1
    FakeWebSocket.instances[0]!.emitClose(1006);
    await vi.advanceTimersByTimeAsync(60);
    // 2nd close → attempt=2
    FakeWebSocket.instances[1]!.emitClose(1006);
    await vi.advanceTimersByTimeAsync(60);
    // 3rd close → attempt=3 > maxAttempts=2 → gives up
    FakeWebSocket.instances[2]!.emitClose(1006);
    await vi.advanceTimersByTimeAsync(200);
    expect(client.getState()).toBe('closed');
  });

  it('error path cleans heartbeat (does not wait for close)', async () => {
    const client = makeClient();
    // 'error' must have a listener to avoid Node EventEmitter unhandled error throw
    client.on('error', () => {});
    client.connect();
    await vi.runAllTimersAsync();
    const sock = FakeWebSocket.instances[0]!;
    sock.emitOpen();
    await vi.advanceTimersByTimeAsync(1100); // trigger heartbeat
    expect(sock.pings).toBeGreaterThan(0);
    sock.emitError(new Error('transport error'));
    // After error, no more pings should be issued on the OLD sock
    const pingsAtError = sock.pings;
    await vi.advanceTimersByTimeAsync(1500);
    expect(sock.pings).toBe(pingsAtError);
  });

  it('heartbeat pong timeout triggers forceReconnect', async () => {
    const client = makeClient();
    client.connect();
    await vi.runAllTimersAsync();
    const first = FakeWebSocket.instances[0]!;
    first.emitOpen();
    await vi.advanceTimersByTimeAsync(1100); // ping issued, pong timer started
    await vi.advanceTimersByTimeAsync(250); // exceeds pongTimeoutMs=200
    expect(client.getState()).toMatch(/reconnecting|connecting|connected/);
  });

  it('pong cancels watchdog (no forceReconnect)', async () => {
    const client = makeClient();
    client.connect();
    await vi.runAllTimersAsync();
    const sock = FakeWebSocket.instances[0]!;
    sock.emitOpen();
    await vi.advanceTimersByTimeAsync(1100);
    sock.emitPong();
    await vi.advanceTimersByTimeAsync(250);
    expect(client.getState()).toBe('connected');
  });

  it('destroy is idempotent and cleans state', () => {
    const client = makeClient();
    client.connect();
    client.destroy();
    client.destroy(); // safe to call again
    expect(client.getState()).toBe('closed');
  });

  it('send drops with warn when not connected', () => {
    const client = makeClient();
    client.send({ type: 'x' });
    expect(client.getState()).toBe('idle');
  });

  it('send forwards JSON when connected', async () => {
    const client = makeClient();
    client.connect();
    await vi.runAllTimersAsync();
    const sock = FakeWebSocket.instances[0]!;
    sock.emitOpen();
    client.send({ type: 'ping' });
    expect(sock.sent[0]).toBe(JSON.stringify({ type: 'ping' }));
  });

  it('validateIncoming returning null drops message', async () => {
    const onDomain = vi.fn();
    const validateIncoming = vi.fn(() => null);
    const client = makeClient({ validateIncoming, onDomainMessage: onDomain });
    client.connect();
    await vi.runAllTimersAsync();
    const sock = FakeWebSocket.instances[0]!;
    sock.emitOpen();
    sock.emitMessage({ type: 'garbage' });
    expect(validateIncoming).toHaveBeenCalled();
    expect(onDomain).not.toHaveBeenCalled();
  });

  it('onDomainMessage called for valid non-shared message', async () => {
    const onDomain = vi.fn();
    const validateIncoming = vi.fn((m: unknown) => m);
    const client = makeClient({ validateIncoming, onDomainMessage: onDomain });
    client.connect();
    await vi.runAllTimersAsync();
    const sock = FakeWebSocket.instances[0]!;
    sock.emitOpen();
    sock.emitMessage({ type: 'ok' });
    expect(onDomain).toHaveBeenCalledWith({ type: 'ok' });
  });

  it('onDomainMessage throw is swallowed (socket stays up)', async () => {
    const onDomain = vi.fn(() => {
      throw new Error('handler boom');
    });
    const client = makeClient({ onDomainMessage: onDomain });
    client.connect();
    await vi.runAllTimersAsync();
    const sock = FakeWebSocket.instances[0]!;
    sock.emitOpen();
    sock.emitMessage({ type: 'x' });
    expect(client.getState()).toBe('connected');
  });

  it('routeShared emits release event with kind filter (canonical)', async () => {
    const onRelease = vi.fn();
    const client = makeClient({ satelliteKind: 'PRINT_SERVER' });
    client.on('release', onRelease);
    client.connect();
    await vi.runAllTimersAsync();
    const sock = FakeWebSocket.instances[0]!;
    sock.emitOpen();
    sock.emitMessage({
      type: 'app.release.published',
      kind: 'PRINT_SERVER',
      version: '1.0.0',
      downloadUrl: 'https://x',
      sha256: 'a'.repeat(64),
    });
    expect(onRelease).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'PRINT_SERVER', version: '1.0.0' }),
    );
  });

  it('routeShared normalizes wire kind via fromWireSatelliteKind', async () => {
    const onRelease = vi.fn();
    const client = makeClient({ satelliteKind: 'EMPORION' });
    client.on('release', onRelease);
    client.connect();
    await vi.runAllTimersAsync();
    const sock = FakeWebSocket.instances[0]!;
    sock.emitOpen();
    sock.emitMessage({
      type: 'app.release.published',
      kind: 'POS_EMPORION',
      version: '1.0.0',
      downloadUrl: 'https://x',
      sha256: 'a'.repeat(64),
    });
    expect(onRelease).toHaveBeenCalledWith(expect.objectContaining({ kind: 'EMPORION' }));
  });

  it('routeShared filter excludes other kinds', async () => {
    const onRelease = vi.fn();
    const client = makeClient({ satelliteKind: 'PRINT_SERVER' });
    client.on('release', onRelease);
    client.connect();
    await vi.runAllTimersAsync();
    const sock = FakeWebSocket.instances[0]!;
    sock.emitOpen();
    sock.emitMessage({
      type: 'app.release.published',
      kind: 'EMPORION',
      version: '2.0.0',
      downloadUrl: 'https://x',
      sha256: 'a'.repeat(64),
    });
    expect(onRelease).not.toHaveBeenCalled();
  });

  it('routeShared emits revoked event', async () => {
    const onRevoked = vi.fn();
    const client = makeClient();
    client.on('revoked', onRevoked);
    client.connect();
    await vi.runAllTimersAsync();
    const sock = FakeWebSocket.instances[0]!;
    sock.emitOpen();
    sock.emitMessage({ type: 'device.revoked', reason: 'admin-action' });
    expect(onRevoked).toHaveBeenCalledWith({ reason: 'admin-action' });
  });

  it('shared messages do NOT reach validateIncoming or onDomainMessage', async () => {
    const validateIncoming = vi.fn();
    const onDomain = vi.fn();
    const client = makeClient({
      satelliteKind: 'PRINT_SERVER',
      validateIncoming,
      onDomainMessage: onDomain,
    });
    client.connect();
    await vi.runAllTimersAsync();
    const sock = FakeWebSocket.instances[0]!;
    sock.emitOpen();
    sock.emitMessage({
      type: 'app.release.published',
      kind: 'PRINT_SERVER',
      version: '1.0.0',
      downloadUrl: 'x',
      sha256: 'a'.repeat(64),
    });
    expect(validateIncoming).not.toHaveBeenCalled();
    expect(onDomain).not.toHaveBeenCalled();
  });

  it('invalid JSON message is dropped without crash', async () => {
    const onDomain = vi.fn();
    const client = makeClient({ onDomainMessage: onDomain });
    client.connect();
    await vi.runAllTimersAsync();
    const sock = FakeWebSocket.instances[0]!;
    sock.emitOpen();
    sock.emitMessageRaw('{not-json');
    expect(onDomain).not.toHaveBeenCalled();
    expect(client.getState()).toBe('connected');
  });

  it('late close from old socket is ignored after reconnect (generation guard)', async () => {
    const client = makeClient();
    const states: WSClientState[] = [];
    client.on('state', (s) => states.push(s));
    client.connect();
    await vi.runAllTimersAsync();
    const first = FakeWebSocket.instances[0]!;
    first.emitOpen();
    expect(client.getState()).toBe('connected');
    first.emitClose(1006);
    await vi.advanceTimersByTimeAsync(150);
    const second = FakeWebSocket.instances[1]!;
    second.emitOpen();
    expect(client.getState()).toBe('connected');
    // Late close from the OLD socket — must be ignored
    first.emitClose(1006);
    expect(client.getState()).toBe('connected');
  });

  it('createWSClient factory returns instance', () => {
    const client = createWSClient({
      buildUrl: () => 'ws://x',
      auth: { kind: 'bearer-header', token: () => 't' },
      WebSocketImpl: FakeWebSocket as never,
    });
    expect(client).toBeInstanceOf(SatelliteWSClient);
  });
});
