/**
 * Persistent top-banner showing the current updater status. Subscribe to
 * the runtime's `connection-state` or your own state and pass the current
 * `status` + optional `version`/`progress`. Clicking "Reiniciar e instalar"
 * fires `onInstall`.
 */
import type * as React from 'react';

export type UpdateBannerStatus = 'checking' | 'available' | 'downloading' | 'downloaded' | 'error';

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

const containerStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 9990,
  padding: '10px 16px',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontSize: 13,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
};

const colorByStatus: Record<UpdateBannerStatus, React.CSSProperties> = {
  checking: { background: '#dbeafe', color: '#1e40af' },
  available: { background: '#fef3c7', color: '#92400e' },
  downloading: { background: '#dbeafe', color: '#1e40af' },
  downloaded: { background: '#d1fae5', color: '#065f46' },
  error: { background: '#fee2e2', color: '#991b1b' },
};

const buttonStyle: React.CSSProperties = {
  marginLeft: 'auto',
  background: 'rgba(255, 255, 255, 0.4)',
  border: '1px solid rgba(0, 0, 0, 0.15)',
  borderRadius: 6,
  padding: '4px 10px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
};

const dismissStyle: React.CSSProperties = {
  ...buttonStyle,
  marginLeft: 6,
  background: 'transparent',
  border: '1px solid transparent',
};

function statusLabel(
  status: UpdateBannerStatus,
  version?: string,
  progress?: number,
  errorMessage?: string,
): string {
  switch (status) {
    case 'checking':
      return 'Verificando atualizações...';
    case 'available':
      return version ? `Atualização ${version} disponível.` : 'Atualização disponível.';
    case 'downloading':
      return progress !== undefined
        ? `Baixando atualização: ${Math.round(progress)}%`
        : 'Baixando atualização...';
    case 'downloaded':
      return version
        ? `Atualização ${version} pronta para instalar.`
        : 'Atualização pronta para instalar.';
    case 'error':
      return errorMessage ? `Erro ao atualizar: ${errorMessage}` : 'Erro ao atualizar.';
  }
}

export function UpdateBanner({
  status,
  version,
  progress,
  errorMessage,
  onInstall,
  onDismiss,
  className,
  installLabel = 'Reiniciar e instalar',
  dismissLabel = 'Fechar',
}: UpdateBannerProps): React.ReactElement {
  return (
    <div
      style={{ ...containerStyle, ...colorByStatus[status] }}
      className={className}
      role="status"
    >
      <span>{statusLabel(status, version, progress, errorMessage)}</span>
      {status === 'downloaded' && onInstall && (
        <button type="button" style={buttonStyle} onClick={onInstall}>
          {installLabel}
        </button>
      )}
      {onDismiss && status !== 'downloaded' && (
        <button type="button" style={dismissStyle} onClick={onDismiss}>
          {dismissLabel}
        </button>
      )}
    </div>
  );
}
