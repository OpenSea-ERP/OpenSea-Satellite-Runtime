import { BrowserWindow } from "electron";
export interface CreateSplashOptions {
    iconPath: string;
    appName: string;
    width?: number;
    height?: number;
}
export interface SplashHandle {
    window: BrowserWindow;
    close(): void;
}
export declare function createSplashWindow(options: CreateSplashOptions): SplashHandle;
//# sourceMappingURL=splash.d.ts.map