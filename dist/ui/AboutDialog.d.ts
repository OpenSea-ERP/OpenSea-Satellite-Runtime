/**
 * About dialog showing app version, build, channel, and links. Headless,
 * inline styles. Override via `className`.
 */
import * as React from "react";
export interface AboutDialogProps {
    open: boolean;
    onClose: () => void;
    appName: string;
    appVersion: string;
    channel?: string;
    build?: string;
    links?: Array<{
        label: string;
        href: string;
    }>;
    copyright?: string;
    className?: string;
    closeLabel?: string;
}
export declare function AboutDialog({ open, onClose, appName, appVersion, channel, build, links, copyright, className, closeLabel, }: AboutDialogProps): React.ReactElement | null;
//# sourceMappingURL=AboutDialog.d.ts.map