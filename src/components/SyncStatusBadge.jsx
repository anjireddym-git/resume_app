import React from 'react';
import { Cloud, Check, Loader2, CloudOff, AlertTriangle } from 'lucide-react';

/**
 * Passive sync-status indicator (no clicks). Reflects autoSyncToDrive state.
 *  - idle:       cloud (muted) — no recent activity
 *  - syncing:    spinner + "Syncing…"
 *  - synced:     cloud+check (green) + "Saved to Drive"
 *  - error:      cloud-off (red) + tooltip
 *  - auth-error: alert + "Reconnect needed"
 */
const SyncStatusBadge = ({ status }) => {
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
      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700">
        <span className="relative inline-flex">
          <Cloud className="w-3.5 h-3.5" />
          <Check className="w-2 h-2 absolute -bottom-0.5 -right-0.5" strokeWidth={3} />
        </span>
        Saved to Drive
      </span>
    );
  }
  if (status === 'auth-error') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-amber-700" title="Reconnect Google Drive">
        <AlertTriangle className="w-3.5 h-3.5" />
        Reconnect needed
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-red-600" title="Sync failed — will retry on next save">
        <CloudOff className="w-3.5 h-3.5" />
        Sync failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-neutral-400">
      <Cloud className="w-3.5 h-3.5" />
      Drive
    </span>
  );
};

export default SyncStatusBadge;
