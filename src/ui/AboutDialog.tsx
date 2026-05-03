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
  links?: Array<{ label: string; href: string }>;
  copyright?: string;
  className?: string;
  closeLabel?: string;
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9998,
  fontFamily: "system-ui, -apple-system, sans-serif",
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  color: "#0f172a",
  borderRadius: 12,
  padding: 28,
  maxWidth: 420,
  width: "calc(100% - 48px)",
  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
};

const headerStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 600,
  marginBottom: 4,
};

const versionStyle: React.CSSProperties = {
  fontSize: 14,
  color: "#64748b",
  marginBottom: 16,
};

const linkListStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: "0 0 16px 0",
};

const linkItemStyle: React.CSSProperties = {
  marginBottom: 6,
};

const linkStyle: React.CSSProperties = {
  color: "#2563eb",
  textDecoration: "none",
};

const closeButtonStyle: React.CSSProperties = {
  background: "#e2e8f0",
  color: "#0f172a",
  border: "none",
  borderRadius: 8,
  padding: "8px 16px",
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
};

const copyrightStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#94a3b8",
  marginTop: 16,
  textAlign: "center" as const,
};

export function AboutDialog({
  open,
  onClose,
  appName,
  appVersion,
  channel,
  build,
  links = [],
  copyright,
  className,
  closeLabel = "Fechar",
}: AboutDialogProps): React.ReactElement | null {
  if (!open) return null;
  return (
    <div
      style={overlayStyle}
      className={className}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>{appName}</div>
        <div style={versionStyle}>
          versão {appVersion}
          {channel ? ` (${channel})` : ""}
          {build ? ` — build ${build}` : ""}
        </div>
        {links.length > 0 && (
          <ul style={linkListStyle}>
            {links.map((l) => (
              <li key={l.href} style={linkItemStyle}>
                <a
                  href={l.href}
                  style={linkStyle}
                  target="_blank"
                  rel="noreferrer"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button" style={closeButtonStyle} onClick={onClose}>
            {closeLabel}
          </button>
        </div>
        {copyright && <div style={copyrightStyle}>{copyright}</div>}
      </div>
    </div>
  );
}
