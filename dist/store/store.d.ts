import ElectronStore from "electron-store";
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
    migrations?: Record<string, (s: ElectronStore<Record<string, unknown>>) => void | Promise<void>>;
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
export declare function createStore<S extends ZodType>(options: CreateStoreOptions<S>): SatelliteStore<S>;
//# sourceMappingURL=store.d.ts.map