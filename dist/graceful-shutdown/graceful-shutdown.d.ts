export interface ShutdownHandlerOptions {
    name?: string;
    timeoutMs?: number;
}
export declare function registerShutdownHandler(fn: () => void | Promise<void>, options?: ShutdownHandlerOptions): void;
/**
 * Run all registered shutdown handlers in parallel. Idempotent (returns the
 * same in-flight promise on repeated calls).
 */
export declare function runShutdownHandlers(): Promise<void>;
/** @internal */
export declare function _resetShutdownForTests(): void;
//# sourceMappingURL=graceful-shutdown.d.ts.map