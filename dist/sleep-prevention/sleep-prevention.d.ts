export type SleepBlockType = "prevent-app-suspension" | "prevent-display-sleep";
export declare function startSleepPrevention(type?: SleepBlockType): boolean;
export declare function stopSleepPrevention(): void;
export declare function isSleepPreventionActive(): boolean;
/** @internal — for tests */
export declare function _resetSleepPreventionForTests(): void;
//# sourceMappingURL=sleep-prevention.d.ts.map