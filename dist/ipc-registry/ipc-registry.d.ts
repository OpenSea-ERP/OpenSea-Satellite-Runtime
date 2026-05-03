/**
 * Typed IPC channel registry. Wraps `ipcMain.handle` with a whitelist of
 * known channel names + zod payload validation. Bridges to a strongly-typed
 * surface for the renderer.
 */
import { type IpcMainInvokeEvent } from "electron";
import type { ZodType, z } from "zod";
export interface IpcChannelDefinition<TPayload extends ZodType, TResult> {
    channel: string;
    payloadSchema?: TPayload;
    handler: (event: IpcMainInvokeEvent, payload: z.infer<TPayload>) => TResult | Promise<TResult>;
}
export declare function registerIpcChannel<TPayload extends ZodType, TResult>(def: IpcChannelDefinition<TPayload, TResult>): void;
export declare function getRegisteredChannels(): readonly string[];
/** @internal — for tests */
export declare function _resetIpcRegistryForTests(): void;
//# sourceMappingURL=ipc-registry.d.ts.map