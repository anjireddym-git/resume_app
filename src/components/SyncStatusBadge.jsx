import React from 'react';
import { Cloud, Check, Loader2, CloudOff, AlertTriangle } from 'lucide-react';

/**
 * Drive sync control. OAuth-triggering actions are always explicit clicks.
 *  - idle:       enable sync or no recent activity
 *  - syncing:    spinner + "Syncing…"
 *  - synced:     cloud+check (green) + "Saved to Drive"
 *  - error:      cloud-off (red) + tooltip
 *  - auth-error: alert + "Reconnect needed"
 */
const SyncStatusBadge = ({
  status,
  enabled,
  error,
  onEnable,
  onReconnect,
  onRetry,
  onDisconnect,
}) => {
  if (!enabled) {
    return (
      <button
        type="button"
        onClick={onEnable}
        className="inline-flex items-center gap-1.5 text-xs text-blue-700 hover:text-blue-800"
        title="Publish this resume as an app-managed Google Docs copy"
      >
        <Cloud className="w-3.5 h-3.5" />
        Enable Drive sync
      </button>
    );
  }
  if (status === 'syncing') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Syncing…
      </span>
    );
  }
  if (status === 'synced') {
    return (
      <button
        type="button"
        onClick={onDisconnect}
        className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800"
        title="Saved as a managed copy. Click to disable automatic Drive sync."
      >
        <span className="relative inline-flex">
          <Cloud className="w-3.5 h-3.5" />
          <Check className="w-2 h-2 absolute -bottom-0.5 -right-0.5" strokeWidth={3} />
        </span>
        Saved to Drive
      </button>
    );
  }
  if (status === 'auth-error') {
    return (
      <button
        type="button"
        onClick={onReconnect}
        className="inline-flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-800"
        title={error || 'Reconnect Google Drive'}
      >
        <AlertTriangle className="w-3.5 h-3.5" />
        Reconnect Drive
      </button>
    );
  }
  if (status === 'error') {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700"
        title={error || 'Sync failed. Click to retry.'}
      >
        <CloudOff className="w-3.5 h-3.5" />
        Sync failed
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-neutral-400">
      <Cloud className="w-3.5 h-3.5" />
      Drive sync ready
    </span>
  );
};

export default SyncStatusBadge;
