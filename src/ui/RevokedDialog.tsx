/**
 * Full-screen dialog shown when the backend revokes the satellite pairing
 * (`device.revoked` event or close code 4003). Headless — no Tailwind
 * required, but accepts `className` overrides if the satellite uses a
 * design system.
 *
 * The runtime only renders + dispatches; satellite is responsible for
 * tearing down state (clearing keytar, navigating to /pair) in `onAck`.
 */
import type * as React from 'react';

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

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.85)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  fontFamily: 'system-ui, -apple-system, sans-serif',
};

const cardStyle: React.CSSProperties = {
  background: '#fff',
  color: '#0f172a',
  borderRadius: 12,
  padding: 32,
  maxWidth: 480,
  width: 'calc(100% - 48px)',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
};

const titleStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 600,
  marginBottom: 12,
};

const messageStyle: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.5,
  marginBottom: 24,
  color: '#475569',
};

const buttonStyle: React.CSSProperties = {
  background: '#dc2626',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '10px 20px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  width: '100%',
};

export function RevokedDialog({
  open,
  reason,
  appName,
  onAck,
  className,
  ackLabel = 'Voltar ao pareamento',
  title = 'Pareamento revogado',
  message,
}: RevokedDialogProps): React.ReactElement | null {
  if (!open) return null;
  const defaultMessage = (
    <>
      O pareamento deste dispositivo com o {appName} foi revogado pelo administrador
      {reason ? ` (motivo: ${reason})` : ''}. Para continuar usando o app, é preciso reaprovar o
      dispositivo no painel administrativo.
    </>
  );
  return (
    <div style={overlayStyle} className={className} role="alertdialog" aria-modal="true">
      <div style={cardStyle}>
        <div style={titleStyle}>{title}</div>
        <div style={messageStyle}>{message ?? defaultMessage}</div>
        <button type="button" style={buttonStyle} onClick={onAck}>
          {ackLabel}
        </button>
      </div>
    </div>
  );
}
