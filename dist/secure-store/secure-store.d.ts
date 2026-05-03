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
export declare function createSecureStore(options: SecureStoreOptions): SecureStore;
//# sourceMappingURL=secure-store.d.ts.map