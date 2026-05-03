export interface FeatureFlagsOptions {
    endpoint: () => string;
    /** Default values used until the first successful fetch (and on fetch failure if cache empty). */
    defaults?: Record<string, boolean | string>;
    /** Poll interval in ms. Default 5 minutes. */
    pollIntervalMs?: number;
    /** Optional auth header builder. */
    authHeader?: () => string | null;
    /** Injectable fetch. Default `globalThis.fetch`. */
    fetchImpl?: typeof fetch;
}
export declare function setupFeatureFlags(options: FeatureFlagsOptions): void;
export declare function stopFeatureFlags(): void;
export declare function isEnabled(flag: string): boolean;
export declare function getString(flag: string, fallback?: string): string;
export declare function snapshot(): Readonly<Record<string, boolean | string>>;
//# sourceMappingURL=feature-flags.d.ts.map