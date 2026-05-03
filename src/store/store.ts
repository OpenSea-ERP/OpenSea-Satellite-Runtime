import ElectronStore from "electron-store";
import fs from "node:fs";
import log from "electron-log";
import type { z, ZodType } from "zod";

export interface CreateStoreOptions<S extends ZodType> {
  name: string;
  schema: S;
  defaults: z.infer<S>;
  /**
   * Migrations forwarded to electron-store. Each migration receives the
   * electron-store instance and may mutate it directly (set/delete) — same
   * shape as electron-store's native migrations API.
   */
  migrations?: Record<
    string,
    (
      s: ElectronStore<Record<string, unknown>>,
    ) => void | Promise<void>
  >;
  /**
   * What to do when the on-disk JSON is corrupt or fails schema parse.
   * - `reset` (default): unlink the file and recreate with defaults.
   * - `throw`: rethrow so the satellite can decide.
   */
  onCorruption?: "throw" | "reset";
}

export interface SatelliteStore<S extends ZodType> {
  get<K extends keyof z.infer<S>>(key: K): z.infer<S>[K];
  set<K extends keyof z.infer<S>>(key: K, value: z.infer<S>[K]): void;
  reset(): void;
  raw: ElectronStore<Record<string, unknown>>;
}

function tryConstruct(
  options: CreateStoreOptions<ZodType>,
): ElectronStore<Record<string, unknown>> {
  return new ElectronStore<Record<string, unknown>>({
    name: options.name,
    defaults: options.defaults as Record<string, unknown>,
    migrations: options.migrations as never,
  });
}

function recoverFromCorruption(
  options: CreateStoreOptions<ZodType>,
  err: unknown,
): ElectronStore<Record<string, unknown>> {
  const onCorruption = options.onCorruption ?? "reset";
  if (onCorruption === "throw") throw err;
  log.error(
    `[satellite-runtime/store:${options.name}] corrupted store, resetting`,
    err,
  );
  const errPath = (err as { path?: string }).path;
  if (errPath && fs.existsSync(errPath)) {
    try {
      fs.unlinkSync(errPath);
    } catch (cleanupErr) {
      log.error(
        `[satellite-runtime/store:${options.name}] failed to unlink corrupted file`,
        cleanupErr,
      );
    }
  }
  return new ElectronStore<Record<string, unknown>>({
    name: options.name,
    defaults: options.defaults as Record<string, unknown>,
  });
}

export function createStore<S extends ZodType>(
  options: CreateStoreOptions<S>,
): SatelliteStore<S> {
  // Validate the supplied defaults up front — a typo in the consumer's
  // defaults object should fail loudly here, not at first read in prod.
  const defaultsParse = options.schema.safeParse(options.defaults);
  if (!defaultsParse.success) {
    throw new Error(
      `[satellite-runtime/store:${options.name}] defaults fail schema validation: ${defaultsParse.error.message}`,
    );
  }

  let electronStore: ElectronStore<Record<string, unknown>>;
  try {
    electronStore = tryConstruct(options);
  } catch (err) {
    electronStore = recoverFromCorruption(options, err);
  }

  // Validate the entire current state against the schema. If parse fails,
  // treat as corruption and reset.
  const initialParse = options.schema.safeParse(electronStore.store);
  if (!initialParse.success) {
    log.error(
      `[satellite-runtime/store:${options.name}] schema validation failed on init: ${initialParse.error.message}`,
    );
    electronStore = recoverFromCorruption(
      options,
      Object.assign(new Error("schema validation failed"), {
        path: (electronStore as unknown as { path?: string }).path,
      }),
    );
    // Re-validate after recovery. If recovered state still fails, throw —
    // we cannot keep recovering in a loop and the satellite needs to know.
    const recoveredParse = options.schema.safeParse(electronStore.store);
    if (!recoveredParse.success) {
      throw new Error(
        `[satellite-runtime/store:${options.name}] recovered state still fails schema: ${recoveredParse.error.message}`,
      );
    }
  }

  return {
    get(key) {
      return electronStore.get(key as string) as never;
    },
    set(key, value) {
      const merged = { ...electronStore.store, [key as string]: value };
      const result = options.schema.safeParse(merged);
      if (!result.success) {
        throw new Error(
          `[satellite-runtime/store:${options.name}] schema validation failed for key="${String(key)}": ${result.error.message}`,
        );
      }
      electronStore.set(key as string, value);
    },
    reset() {
      electronStore.clear();
      for (const [k, v] of Object.entries(
        options.defaults as Record<string, unknown>,
      )) {
        electronStore.set(k, v);
      }
    },
    raw: electronStore,
  };
}
