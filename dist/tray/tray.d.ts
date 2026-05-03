import { Tray, type MenuItemConstructorOptions } from "electron";
export interface CreateSatelliteTrayOptions {
    iconPath: string;
    appName: string;
    onShow?: () => void;
    onQuit?: () => void;
    customMenuItems?: MenuItemConstructorOptions[];
    tooltip?: string;
}
export interface SatelliteTrayHandle {
    tray: Tray;
    destroy(): void;
    updateMenu(items: MenuItemConstructorOptions[]): void;
    setTooltip(text: string): void;
    showBalloon(title: string, content: string): void;
}
export declare function createSatelliteTray(options: CreateSatelliteTrayOptions): SatelliteTrayHandle;
//# sourceMappingURL=tray.d.ts.map