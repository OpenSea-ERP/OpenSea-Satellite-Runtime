export interface SetupAutoLaunchOptions {
    name: string;
    isHidden?: boolean;
}
export declare function setupAutoLaunch(options: SetupAutoLaunchOptions): Promise<void>;
export declare function isAutoLaunchEnabled(name: string): Promise<boolean>;
export declare function enableAutoLaunch(name: string, isHidden?: boolean): Promise<void>;
export declare function disableAutoLaunch(name: string): Promise<void>;
export declare function toggleAutoLaunch(name: string, isHidden?: boolean): Promise<boolean>;
/** @internal — for tests */
export declare function _resetAutoLaunchForTests(): void;
//# sourceMappingURL=auto-launch.d.ts.map