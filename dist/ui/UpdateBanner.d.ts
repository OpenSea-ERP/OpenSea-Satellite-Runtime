/**
 * Persistent top-banner showing the current updater status. Subscribe to
 * the runtime's `connection-state` or your own state and pass the current
 * `status` + optional `version`/`progress`. Clicking "Reiniciar e instalar"
 * fires `onInstall`.
 */
import * as React from "react";
export type UpdateBannerStatus = "checking" | "available" | "downloading" | "downloaded" | "error";
export interface UpdateBannerProps {
    status: UpdateBannerStatus;
    version?: string;
    progress?: number;
    errorMessage?: string;
    onInstall?: () => void;
    onDismiss?: () => void;
    className?: string;
    installLabel?: string;
    dismissLabel?: string;
}
export declare function UpdateBanner({ status, version, progress, errorMessage, onInstall, onDismiss, className, installLabel, dismissLabel, }: UpdateBannerProps): React.ReactElement;
//# sourceMappingURL=UpdateBanner.d.ts.map