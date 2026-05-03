export interface TelemetryPayload {
    device_id: string;
    app_name: string;
    app_version: string;
    os: string;
    platform: NodeJS.Platform;
    locale: string;
    last_seen: string;
    custom?: Record<string, unknown>;
}
export interface SetupTelemetryOptions {
    /** Endpoint that accepts a POST with the JSON payload. */
    endpoint: string;
    /** Whether telemetry is enabled. Default false. */
    enabled?: boolean;
    /** Source of the device ID (typically pulled from the satellite store). */
    deviceId: () => string | null;
    /** App name (matches what the backend expects). */
    appName: string;
    /** Optional extra fields for the payload. */
    custom?: () => Record<string, unknown>;
    /** Daily ping interval in ms. Default 24h. */
    intervalMs?: number;
    /** HTTP fetch implementation. Default `globalThis.fetch`. */
    fetchImpl?: typeof fetch;
}
export declare function setupTelemetry(options: SetupTelemetryOptions): void;
export declare function stopTelemetry(): void;
//# sourceMappingURL=telemetry.d.ts.map