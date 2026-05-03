import type { SatelliteTrayHandle } from "../tray/tray";
interface MockTrayCalls {
    destroy: number;
    setTooltip: string[];
    showBalloon: Array<{
        title: string;
        content: string;
    }>;
    updateMenu: number;
}
export declare function mockTray(): SatelliteTrayHandle & {
    calls: MockTrayCalls;
};
export {};
//# sourceMappingURL=mock-tray.d.ts.map