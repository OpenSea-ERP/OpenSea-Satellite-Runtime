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
export declare function migrateApiUrl(options: MigrateApiUrlOptions): void;
//# sourceMappingURL=migrate-api-url.d.ts.map