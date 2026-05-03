/**
 * Helper that rewrites a stored `apiUrl` value when it matches a list of
 * known-stale URLs. Extracted from the identical `migrateStaleApiUrl()`
 * in PrintServer and Emporion. Only runs in packaged builds (so dev can
 * point at localhost without churn).
 */
import { app } from "electron";
import log from "electron-log";

export interface MigrateApiUrlOptions {
  /** Reader for the current persisted value. */
  read: () => string;
  /** Writer for the new (canonical) value. */
  write: (value: string) => void;
  /** Set of known-stale URL strings to rewrite. Match is exact. */
  staleUrls: ReadonlySet<string> | readonly string[];
  /** Canonical URL to write when stale is detected. */
  canonicalUrl: string;
  /** Name used in log messages. Default 'apiUrl'. */
  fieldName?: string;
  /** Force packaged behavior regardless of `app.isPackaged`. */
  force?: boolean;
}

export function migrateApiUrl(options: MigrateApiUrlOptions): void {
  if (!options.force && !app.isPackaged) return;
  const fieldName = options.fieldName ?? "apiUrl";
  const staleSet =
    options.staleUrls instanceof Set
      ? options.staleUrls
      : new Set(options.staleUrls);
  try {
    const current = options.read();
    if (staleSet.has(current)) {
      log.warn(
        `[satellite-runtime/migrate-api-url] ${fieldName} obsoleto (${current}); reescrevendo para ${options.canonicalUrl}`,
      );
      options.write(options.canonicalUrl);
    }
  } catch (err) {
    log.error(
      `[satellite-runtime/migrate-api-url] migration of ${fieldName} failed:`,
      err,
    );
  }
}
