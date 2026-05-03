/**
 * Minimal `Electron.App` shape consumed by the runtime modules.
 * Strongly typed so consumers catch shape drift at compile time.
 */
export interface MockApp {
    isPackaged: boolean;
    requestSingleInstanceLock(): boolean;
    quit(): void;
    exit(code?: number): void;
    on(event: string, handler: (...args: unknown[]) => void): MockApp;
    removeListener(event: string, handler: (...args: unknown[]) => void): MockApp;
    emit(event: string, ...args: unknown[]): boolean;
    whenReady(): Promise<void>;
}
export interface MockAppOverrides {
    isPackaged?: boolean;
    lockWillBeAcquired?: boolean;
}
export declare function mockApp(overrides?: MockAppOverrides): MockApp;
//# sourceMappingURL=mock-app.d.ts.map