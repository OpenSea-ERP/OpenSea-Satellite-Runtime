/**
 * Typed IPC channel registry. Wraps `ipcMain.handle` with a whitelist of
 * known channel names + zod payload validation. Bridges to a strongly-typed
 * surface for the renderer.
 */
import { type IpcMainInvokeEvent, ipcMain } from 'electron';
import log from 'electron-log';
import type { ZodType, z } from 'zod';

export interface IpcChannelDefinition<TPayload extends ZodType, TResult> {
  channel: string;
  payloadSchema?: TPayload;
  handler: (event: IpcMainInvokeEvent, payload: z.infer<TPayload>) => TResult | Promise<TResult>;
}

const registered = new Set<string>();

export function registerIpcChannel<TPayload extends ZodType, TResult>(
  def: IpcChannelDefinition<TPayload, TResult>,
): void {
  if (registered.has(def.channel)) {
    log.warn(
      `[satellite-runtime/ipc-registry] channel "${def.channel}" already registered; skipping`,
    );
    return;
  }
  registered.add(def.channel);

  ipcMain.handle(def.channel, async (event, raw) => {
    if (def.payloadSchema) {
      const parsed = def.payloadSchema.safeParse(raw);
      if (!parsed.success) {
        log.warn(
          `[satellite-runtime/ipc-registry] ${def.channel}: payload rejected — ${parsed.error.message}`,
        );
        return {
          ok: false,
          error: 'invalid payload',
          details: parsed.error.message,
        };
      }
      try {
        const result = await def.handler(event, parsed.data);
        return { ok: true, data: result };
      } catch (err) {
        log.error(`[satellite-runtime/ipc-registry] ${def.channel} threw:`, err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : 'unknown error',
        };
      }
    }
    try {
      const result = await def.handler(event, raw as never);
      return { ok: true, data: result };
    } catch (err) {
      log.error(`[satellite-runtime/ipc-registry] ${def.channel} threw:`, err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'unknown error',
      };
    }
  });
}

export function getRegisteredChannels(): readonly string[] {
  return Array.from(registered);
}

/** @internal — for tests */
export function _resetIpcRegistryForTests(): void {
  for (const c of registered) ipcMain.removeHandler(c);
  registered.clear();
}
