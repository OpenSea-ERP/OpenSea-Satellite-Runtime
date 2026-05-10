import type { ZodType, z } from 'zod';
import type { SatelliteStore } from '../store/store';

/**
 * Subset of `electron-store` methods actually used by runtime modules.
 * Used as the type of `MockSatelliteStore.raw`.
 */
export interface MockElectronStoreRaw {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  delete(key: string): void;
  clear(): void;
  readonly store: Record<string, unknown>;
}

/**
 * In-memory store implementing the `SatelliteStore` shape exposed by
 * `createStore`. Uses a fresh map per instance so tests can run in parallel.
 */
export function mockStore<S extends ZodType>(
  initial: z.infer<S>,
): SatelliteStore<S> & { raw: MockElectronStoreRaw } {
  let data: Record<string, unknown> = {
    ...(initial as Record<string, unknown>),
  };
  const raw: MockElectronStoreRaw = {
    get(key) {
      return data[key];
    },
    set(key, value) {
      data[key] = value;
    },
    delete(key) {
      delete data[key];
    },
    clear() {
      data = {};
    },
    get store() {
      return { ...data };
    },
  };
  return {
    get(key) {
      return data[key as string] as never;
    },
    set(key, value) {
      data[key as string] = value;
    },
    reset() {
      data = { ...(initial as Record<string, unknown>) };
    },
    raw: raw as never,
  } as SatelliteStore<S> & { raw: MockElectronStoreRaw };
}
