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
import { EventEmitter } from "node:events";
import WebSocket from "ws";
import { type SatelliteKind } from "@opensea/satellite-contract";
export type WSClientState = "idle" | "waiting-auth" | "connecting" | "connected" | "reconnecting" | "error" | "closed";
export type AuthMode<TOut> = {
    kind: "bearer-header";
    token: () => string | null | undefined | Promise<string | null | undefined>;
} | {
    kind: "hello-message";
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
    phase: "open" | "close" | "error" | "heartbeat";
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
export declare class SatelliteWSClient<TIn = unknown, TOut = unknown> extends EventEmitter {
    private state;
    private socket;
    private generation;
    private reconnectAttempts;
    private reconnectTimer;
    private heartbeatTimer;
    private pongTimer;
    private destroyed;
    private readonly opts;
    private readonly reconnectCfg;
    private readonly heartbeatCfg;
    private readonly logger;
    private readonly WS;
    private readonly jitter;
    constructor(options: SatelliteWSClientOptions<TIn, TOut>);
    getState(): WSClientState;
    isConnected(): boolean;
    getReconnectAttempts(): number;
    /**
     * Attempt to connect. Idempotent: in `connected/connecting/reconnecting`
     * states logs a warn and no-ops. Re-entrant after `waiting-auth/error/closed`:
     * caller may invoke `connect()` again once token is available.
     */
    connect(): void;
    /** Graceful disconnect without scheduling reconnect. */
    disconnect(): void;
    /** Permanent teardown. Idempotent. */
    destroy(): void;
    /** Send a message. Drops with warn if not connected. */
    send(message: TOut): void;
    private setState;
    private openSocket;
    private attachSocketListeners;
    private removeSocketListeners;
    private dispatchIncoming;
    private tryRouteShared;
    private startHeartbeat;
    private cleanupHeartbeat;
    private cancelReconnect;
    private handleAuthFailure;
    private handleErrorPath;
    private scheduleReconnect;
}
export declare function createWSClient<TIn = unknown, TOut = unknown>(options: SatelliteWSClientOptions<TIn, TOut>): SatelliteWSClient<TIn, TOut>;
//# sourceMappingURL=ws-client.d.ts.map