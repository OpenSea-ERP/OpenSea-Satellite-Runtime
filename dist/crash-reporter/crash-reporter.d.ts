export interface SetupCrashReporterOptions {
    /** Submission endpoint (Sentry/BugSnag/in-house). */
    submitURL: string;
    /** Product name shown in the crash report. */
    productName: string;
    /** App version. */
    companyName?: string;
    /** Whether to upload reports automatically. Default true. */
    uploadToServer?: boolean;
    /** Extra metadata sent with each report. */
    extra?: Record<string, string>;
}
export declare function setupCrashReporter(options: SetupCrashReporterOptions): void;
/** @internal — for tests */
export declare function _resetCrashReporterForTests(): void;
//# sourceMappingURL=crash-reporter.d.ts.map