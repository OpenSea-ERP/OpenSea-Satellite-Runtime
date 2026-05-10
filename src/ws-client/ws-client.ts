/**
 * Generic WebSocket client for OpenSea satellites.
 *
 * Owns transport lifecycle, reconnect with exponential backoff + jitter,
 * heartbeat, multi-call safety via per-socket generation, built-in routing
 * of Satellite Contract shared messages (`app.release.published`,
 * `device.revoked`), and emission of state changes via EventEmitter.
 *
 * Domain validators and handlers stay in the satellite — runtime is
 * transport-only. See spec C-A1..C-A8 in
 * `docs/superpowers/specs/2026-05-03-satellite-runtime-connection-design.md`.
 */
import { EventEmitter } from 'node:events';
import { fromWireSatelliteKind, type SatelliteKind } from '@opensea/satellite-contract';
import log from 'electron-log';
import WebSocket from 'ws';

// ── Public types ───────────────────────────────────────────────────────────
export type WSClientState =
  | 'idle'
  | 'waiting-auth'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error'
  | 'closed';

export type AuthMode<TOut> =
  | {
      kind: 'bearer-header';
      token: () => string | null | undefined | Promise<string | null | undefined>;
    }
  | {
      kind: 'hello-message';
      token: () => string | null | undefined | Promise<string | null | undefined>;
      buildHelloMessages: (token: string) => TOut[] | Promise<TOut[]>;
    };

export interface ReconnectOptions {
  initialMs?: number;
  maxMs?: number;
  jitterPct?: number;
  maxAttempts?: number;
}

export interface HeartbeatOptions<TOut> {
  intervalMs?: number;
  pongTimeoutMs?: number;
  appHeartbeat?: () => TOut | null;
}

export interface ShouldReconnectInfo {
  closeCode?: number;
  error?: Error;
  phase: 'open' | 'close' | 'error' | 'heartbeat';
}

export interface SatelliteWSClientOptions<TIn = unknown, TOut = unknown> {
  buildUrl: () => string;
  auth: AuthMode<TOut>;
  reconnect?: ReconnectOptions;
  heartbeat?: HeartbeatOptions<TOut>;
  validateIncoming?: (raw: unknown) => TIn | null;
  onDomainMessage?: (msg: TIn) => void;
  routeShared?: boolean;
  satelliteKind?: SatelliteKind;
  logScope?: string;
  /**
   * Hook deciding whether to reconnect after a socket close/error.
   * Default: returns false for closeCode 4001 (auth fail) or 4003 (revoked);
   * returns true otherwise.
   */
  shouldReconnect?: (info: ShouldReconnectInfo) => boolean;
  /**
   * Injectable jitter source for deterministic tests. Default: Math.random.
   */
  jitterFn?: () => number;
  /**
   * Injectable WebSocket constructor. Default: imported `ws` package.
   * Tests may inject a fake transport.
   */
  WebSocketImpl?: typeof WebSocket;
}

export interface ReleaseEventPayload {
  kind: SatelliteKind;
  version: string;
  downloadUrl: string;
  sha256: string;
}

export interface RevokedEventPayload {
  reason: string;
}

// ── Defaults ───────────────────────────────────────────────────────────────
const DEFAULT_RECONNECT: Required<ReconnectOptions> = {
  initialMs: 1000,
  maxMs: 30000,
  jitterPct: 10,
  maxAttempts: Number.POSITIVE_INFINITY,
};

const DEFAULT_HEARTBEAT = {
  intervalMs: 25000,
  pongTimeoutMs: 10000,
};

function defaultShouldReconnect(info: ShouldReconnectInfo): boolean {
  if (info.closeCode === 4001 || info.closeCode === 4003) return false;
  return true;
}

// ── Implementation ─────────────────────────────────────────────────────────

export class SatelliteWSClient<TIn = unknown, TOut = unknown> extends EventEmitter {
  private state: WSClientState = 'idle';
  private socket: WebSocket | null = null;
  private generation = 0;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  private readonly opts: SatelliteWSClientOptions<TIn, TOut>;
  private readonly reconnectCfg: Required<ReconnectOptions>;
  private readonly heartbeatCfg: { intervalMs: number; pongTimeoutMs: number };
  private readonly logger: typeof log;
  private readonly WS: typeof WebSocket;
  private readonly jitter: () => number;

  constructor(options: SatelliteWSClientOptions<TIn, TOut>) {
    super();
    this.opts = options;
    this.reconnectCfg = { ...DEFAULT_RECONNECT, ...(options.reconnect ?? {}) };
    this.heartbeatCfg = {
      intervalMs: options.heartbeat?.intervalMs ?? DEFAULT_HEARTBEAT.intervalMs,
      pongTimeoutMs: options.heartbeat?.pongTimeoutMs ?? DEFAULT_HEARTBEAT.pongTimeoutMs,
    };
    this.logger = log.scope(options.logScope ?? 'satellite-runtime/ws') as never;
    this.WS = options.WebSocketImpl ?? WebSocket;
    this.jitter = options.jitterFn ?? Math.random;
  }

  getState(): WSClientState {
    return this.state;
  }

  isConnected(): boolean {
    return this.state === 'connected';
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  /**
   * Attempt to connect. Idempotent: in `connected/connecting/reconnecting`
   * states logs a warn and no-ops. Re-entrant after `waiting-auth/error/closed`:
   * caller may invoke `connect()` again once token is available.
   */
  connect(): void {
    if (this.destroyed) {
      this.logger.warn('connect() called after destroy(); ignored');
      return;
    }
    if (
      this.state === 'connecting' ||
      this.state === 'connected' ||
      this.state === 'reconnecting'
    ) {
      this.logger.warn(`connect() called in state=${this.state}; ignored`);
      return;
    }
    this.openSocket();
  }

  /** Graceful disconnect without scheduling reconnect. */
  disconnect(): void {
    this.cancelReconnect();
    this.cleanupHeartbeat();
    if (this.socket) {
      try {
        this.socket.close(1000, 'client disconnect');
      } catch (err) {
        this.logger.warn('error during socket.close():', err);
      }
      this.socket = null;
    }
    this.setState('closed');
  }

  /** Permanent teardown. Idempotent. */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    // Bump generation so any in-flight openSocket() awaiting auth.token()
    // bails out before attaching listeners (Codex post-impl review fix #1).
    this.generation += 1;
    this.cancelReconnect();
    this.cleanupHeartbeat();
    if (this.socket) {
      try {
        this.removeSocketListeners(this.socket);
        this.socket.close(1000, 'destroy');
      } catch {
        /* ignore */
      }
      this.socket = null;
    }
    this.setState('closed');
    this.removeAllListeners();
  }

  /**
   * Send a message. Returns true if the JSON was handed to the socket;
   * false if the client is not connected or the socket rejected the send.
   */
  send(message: TOut): boolean {
    if (this.state !== 'connected' || !this.socket) {
      this.logger.warn(`send() called in state=${this.state}; dropping`);
      return false;
    }
    try {
      this.socket.send(JSON.stringify(message));
      return true;
    } catch (err) {
      this.logger.error('send() failed:', err);
      return false;
    }
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  private setState(next: WSClientState): void {
    if (this.state === next) return;
    this.state = next;
    this.emit('state', next);
  }

  private async openSocket(): Promise<void> {
    const myGeneration = ++this.generation;
    this.setState('connecting');

    let token: string | null | undefined;
    try {
      token = await this.opts.auth.token();
    } catch (err) {
      this.logger.error('auth.token() threw:', err);
      this.handleAuthFailure(myGeneration);
      return;
    }

    // Codex post-impl review fix #1: check destroyed/generation after every
    // async boundary. destroy() bumps generation so this guard catches
    // teardown that happened during the auth.token() await.
    if (this.destroyed || myGeneration !== this.generation) return;

    if (!token) {
      this.logger.info('no auth token; entering waiting-auth state');
      this.setState('waiting-auth');
      return;
    }

    const url = this.opts.buildUrl();
    let socket: WebSocket;
    try {
      const wsOptions =
        this.opts.auth.kind === 'bearer-header'
          ? { headers: { Authorization: `Bearer ${token}` } }
          : undefined;
      socket = new this.WS(url, wsOptions);
    } catch (err) {
      this.logger.error('WebSocket construction failed:', err);
      this.handleErrorPath(err as Error, myGeneration, 'open');
      return;
    }

    if (this.destroyed || myGeneration !== this.generation) {
      try {
        socket.close();
      } catch {
        /* ignore */
      }
      return;
    }
    this.socket = socket;
    this.attachSocketListeners(socket, myGeneration, token);
  }

  private attachSocketListeners(socket: WebSocket, myGeneration: number, token: string): void {
    const onOpen = (): void => {
      if (myGeneration !== this.generation) return;
      this.reconnectAttempts = 0;
      this.setState('connected');
      this.emit('open');
      this.startHeartbeat(myGeneration);
      // Hello messages auth: send after open.
      if (this.opts.auth.kind === 'hello-message') {
        void Promise.resolve(this.opts.auth.buildHelloMessages(token))
          .then((msgs) => {
            for (const msg of msgs) this.send(msg);
          })
          .catch((err) => this.logger.error('hello messages build failed:', err));
      }
    };

    const onMessage = (raw: WebSocket.RawData): void => {
      if (myGeneration !== this.generation) return;
      this.dispatchIncoming(raw);
    };

    const onClose = (code: number, reason: Buffer): void => {
      if (myGeneration !== this.generation) return;
      this.logger.info(`socket close: code=${code} reason=${reason.toString()}`);
      this.cleanupHeartbeat();
      this.socket = null;
      this.handleErrorPath(undefined, myGeneration, 'close', code);
    };

    const onError = (err: Error): void => {
      if (myGeneration !== this.generation) return;
      this.logger.error('socket error:', err);
      this.cleanupHeartbeat();
      this.emit('error', err);
      this.handleErrorPath(err, myGeneration, 'error');
    };

    const onPong = (): void => {
      if (myGeneration !== this.generation) return;
      if (this.pongTimer) {
        clearTimeout(this.pongTimer);
        this.pongTimer = null;
      }
    };

    socket.on('open', onOpen);
    socket.on('message', onMessage);
    socket.on('close', onClose);
    socket.on('error', onError);
    socket.on('pong', onPong);
  }

  private removeSocketListeners(socket: WebSocket): void {
    socket.removeAllListeners('open');
    socket.removeAllListeners('message');
    socket.removeAllListeners('close');
    socket.removeAllListeners('error');
    socket.removeAllListeners('pong');
  }

  private dispatchIncoming(raw: WebSocket.RawData): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.toString());
    } catch (err) {
      this.logger.warn('incoming message JSON parse failed:', err);
      return;
    }
    this.emit('message', parsed);

    const routeShared = this.opts.routeShared !== false;
    if (routeShared && this.tryRouteShared(parsed)) return;

    if (this.opts.validateIncoming) {
      const validated = this.opts.validateIncoming(parsed);
      if (validated === null) {
        this.logger.debug('incoming dropped by validator:', parsed);
        return;
      }
      try {
        this.opts.onDomainMessage?.(validated);
      } catch (err) {
        this.logger.error('onDomainMessage threw (swallowed):', err);
      }
    } else if (this.opts.onDomainMessage) {
      try {
        this.opts.onDomainMessage(parsed as TIn);
      } catch (err) {
        this.logger.error('onDomainMessage threw (swallowed):', err);
      }
    }
  }

  private tryRouteShared(parsed: unknown): boolean {
    if (!parsed || typeof parsed !== 'object') return false;
    const obj = parsed as { type?: string };
    if (obj.type === 'app.release.published') {
      const msg = parsed as {
        version?: unknown;
        downloadUrl?: unknown;
        sha256?: unknown;
        kind?: unknown;
      };
      if (
        typeof msg.version !== 'string' ||
        typeof msg.downloadUrl !== 'string' ||
        typeof msg.sha256 !== 'string' ||
        typeof msg.kind !== 'string'
      ) {
        this.logger.warn('app.release.published with invalid shape; dropping:', parsed);
        return true;
      }
      let canonical: SatelliteKind;
      try {
        canonical = fromWireSatelliteKind(msg.kind as never);
      } catch {
        // accept canonical names too
        canonical = msg.kind as SatelliteKind;
      }
      if (this.opts.satelliteKind && canonical !== this.opts.satelliteKind) {
        this.logger.debug(
          `release for kind=${canonical} ignored (we are ${this.opts.satelliteKind})`,
        );
        return true;
      }
      const payload: ReleaseEventPayload = {
        kind: canonical,
        version: msg.version,
        downloadUrl: msg.downloadUrl,
        sha256: msg.sha256,
      };
      this.emit('release', payload);
      return true;
    }
    if (obj.type === 'device.revoked') {
      const msg = parsed as { reason?: unknown };
      const payload: RevokedEventPayload = {
        reason: typeof msg.reason === 'string' ? msg.reason : 'unknown',
      };
      this.emit('revoked', payload);
      return true;
    }
    return false;
  }

  private startHeartbeat(myGeneration: number): void {
    this.cleanupHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (myGeneration !== this.generation) return;
      if (!this.socket || this.state !== 'connected') return;
      try {
        this.socket.ping();
      } catch (err) {
        this.logger.warn('ping failed:', err);
      }
      const appHb = this.opts.heartbeat?.appHeartbeat?.();
      if (appHb !== null && appHb !== undefined) {
        this.send(appHb);
      }
      // pong watchdog
      if (this.pongTimer) clearTimeout(this.pongTimer);
      this.pongTimer = setTimeout(() => {
        if (myGeneration !== this.generation) return;
        this.logger.warn(
          `heartbeat pong timeout after ${this.heartbeatCfg.pongTimeoutMs}ms; forceReconnect`,
        );
        this.cleanupHeartbeat();
        this.handleErrorPath(new Error('heartbeat pong timeout'), myGeneration, 'heartbeat');
      }, this.heartbeatCfg.pongTimeoutMs);
    }, this.heartbeatCfg.intervalMs);
  }

  private cleanupHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }

  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private handleAuthFailure(myGeneration: number): void {
    if (myGeneration !== this.generation || this.destroyed) return;
    this.setState('error');
    this.scheduleReconnect('error');
  }

  private handleErrorPath(
    err: Error | undefined,
    myGeneration: number,
    phase: ShouldReconnectInfo['phase'],
    closeCode?: number,
  ): void {
    if (myGeneration !== this.generation || this.destroyed) return;

    // Codex post-impl review fix #3: decide reconnect FIRST so non-reconnectable
    // closes (4001/4003 / shouldReconnect=false) don't emit a spurious
    // 'reconnecting' transition before 'closed'.
    const decideFn = this.opts.shouldReconnect ?? defaultShouldReconnect;
    const should = decideFn({ closeCode, error: err, phase });
    if (!should) {
      this.logger.info(
        `shouldReconnect returned false (phase=${phase}, closeCode=${closeCode}); staying closed`,
      );
      this.setState('closed');
      return;
    }
    this.scheduleReconnect(phase);
  }

  private scheduleReconnect(phase: ShouldReconnectInfo['phase']): void {
    this.reconnectAttempts += 1;
    if (this.reconnectAttempts > this.reconnectCfg.maxAttempts) {
      this.logger.error(
        `max reconnect attempts (${this.reconnectCfg.maxAttempts}) reached; giving up`,
      );
      this.setState('closed');
      this.emit('error', new Error('max reconnect attempts reached'));
      return;
    }
    const base = Math.min(
      this.reconnectCfg.initialMs * 2 ** (this.reconnectAttempts - 1),
      this.reconnectCfg.maxMs,
    );
    const jitterRange = (base * this.reconnectCfg.jitterPct) / 100;
    const delay = Math.round(base + (this.jitter() - 0.5) * 2 * jitterRange);
    this.logger.info(
      `reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}, phase=${phase})`,
    );
    this.setState('reconnecting');
    this.cancelReconnect();
    this.reconnectTimer = setTimeout(() => {
      if (this.destroyed) return;
      this.openSocket();
    }, delay);
  }
}

export function createWSClient<TIn = unknown, TOut = unknown>(
  options: SatelliteWSClientOptions<TIn, TOut>,
): SatelliteWSClient<TIn, TOut> {
  return new SatelliteWSClient<TIn, TOut>(options);
}
