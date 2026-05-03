/**
 * Narrow connection state broadcaster: holds last known status and pushes
 * it to all live BrowserWindows over IPC. Does NOT poll, derive from
 * multiple sources, or listen to WS — satellites combine `ws-client.on('state')`
 * with this broadcaster to keep the renderer in sync.
 */
import { BrowserWindow } from "electron";
export type ConnectionStatus = "connected" | "connecting" | "disconnected" | "error";
export interface ConnectionStatePayload {
    status: ConnectionStatus;
    /** Optional: last error message when status='error'. */
    error?: string;
    /** Optional: timestamp of last successful connect. */
    lastConnectedAt?: number;
}
export interface ConnectionStateOptions {
    ipcChannel?: string;
    windows?: () => BrowserWindow[];
}
export interface ConnectionStateBroadcaster {
    set(payload: ConnectionStatePayload): void;
    get(): ConnectionStatePayload;
}
export declare function createConnectionStateBroadcaster(options?: ConnectionStateOptions): ConnectionStateBroadcaster;
//# sourceMappingURL=connection-state.d.ts.map