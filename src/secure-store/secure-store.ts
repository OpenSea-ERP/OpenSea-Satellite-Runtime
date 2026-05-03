/**
 * Secure store wrapper over `keytar`. Per-satellite service namespace.
 *
 * In `NODE_ENV=test` automatically uses a per-process in-memory backend so
 * Playwright suites do not pollute the OS Credential Manager / Keychain
 * across runs (Emporion gold standard).
 */
import keytar from "keytar";
import log from "electron-log";

export interface SecureStoreOptions {
  /** Service name used as the keytar service namespace. */
  service: string;
  /**
   * Force test-mode (in-memory) regardless of NODE_ENV. Useful for
   * Vitest specs that don't set NODE_ENV but want isolation.
   */
  testMode?: boolean;
}

export interface SecureStore {
  get(account: string): Promise<string | null>;
  set(account: string, value: string): Promise<void>;
  delete(account: string): Promise<void>;
}

export function createSecureStore(options: SecureStoreOptions): SecureStore {
  const isTestMode = options.testMode ?? process.env.NODE_ENV === "test";
  const memory = new Map<string, string>();
  const logger = log.scope(`secure-store:${options.service}`);

  return {
    async get(account) {
      if (isTestMode) return memory.get(account) ?? null;
      try {
        return await keytar.getPassword(options.service, account);
      } catch (err) {
        logger.error(`get(${account}) failed:`, err);
        return null;
      }
    },
    async set(account, value) {
      if (isTestMode) {
        memory.set(account, value);
        return;
      }
      try {
        await keytar.setPassword(options.service, account, value);
      } catch (err) {
        logger.error(`set(${account}) failed:`, err);
        throw err;
      }
    },
    async delete(account) {
      if (isTestMode) {
        memory.delete(account);
        return;
      }
      try {
        await keytar.deletePassword(options.service, account);
      } catch (err) {
        logger.error(`delete(${account}) failed:`, err);
      }
    },
  };
}
