/**
 * Full-screen dialog shown when the backend revokes the satellite pairing
 * (`device.revoked` event or close code 4003). Headless — no Tailwind
 * required, but accepts `className` overrides if the satellite uses a
 * design system.
 *
 * The runtime only renders + dispatches; satellite is responsible for
 * tearing down state (clearing keytar, navigating to /pair) in `onAck`.
 */
import * as React from "react";
export interface RevokedDialogProps {
    open: boolean;
    reason?: string;
    appName: string;
    onAck: () => void;
    className?: string;
    ackLabel?: string;
    /** Custom title (default: "Pareamento revogado"). */
    title?: string;
    /** Custom message (default friendly Portuguese). */
    message?: React.ReactNode;
}
export declare function RevokedDialog({ open, reason, appName, onAck, className, ackLabel, title, message, }: RevokedDialogProps): React.ReactElement | null;
//# sourceMappingURL=RevokedDialog.d.ts.map