import log from "electron-log";
export interface SetupLogOptions {
    scope: string;
    level?: "silly" | "debug" | "info" | "warn" | "error" | "verbose";
    rotation?: {
        maxSizeMb?: number;
    };
}
export declare function setupLog(options: SetupLogOptions): void;
export declare function getLogger(scopeName: string): ReturnType<typeof log.scope>;
/** @internal — only for tests */
export declare function _resetLogForTests(): void;
//# sourceMappingURL=log.d.ts.map