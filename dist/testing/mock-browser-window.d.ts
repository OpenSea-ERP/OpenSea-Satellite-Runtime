/**
 * Minimal `BrowserWindow` shape consumed by the runtime modules. Strongly
 * typed so consumers catch shape drift at compile time. Uses an internal
 * `EventEmitter` for realistic on/removeListener semantics.
 */
export interface MockBrowserWindow {
    bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    destroyed: boolean;
    maximized: boolean;
    setBounds(b: {
        x?: number;
        y?: number;
        width?: number;
        height?: number;
    }): void;
    getBounds(): {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    isMaximized(): boolean;
    isMinimized(): boolean;
    maximize(): void;
    unmaximize(): void;
    show(): void;
    hide(): void;
    close(): void;
    destroy(): void;
    isDestroyed(): boolean;
    focus(): void;
    restore(): void;
    on(event: string, handler: (...args: unknown[]) => void): MockBrowserWindow;
    removeListener(event: string, handler: (...args: unknown[]) => void): MockBrowserWindow;
    emit(event: string, ...args: unknown[]): boolean;
    webContents: {
        send(channel: string, ...args: unknown[]): void;
        on(event: string, handler: (...args: unknown[]) => void): void;
    };
}
export declare function mockBrowserWindow(): MockBrowserWindow;
//# sourceMappingURL=mock-browser-window.d.ts.map