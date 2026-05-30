import React, { useEffect, useState, useRef } from 'react';
import { Cloud, ShieldCheck, RefreshCw, Loader2, AlertTriangle, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Full-screen gate shown after Firebase auth succeeds but before Google Drive
 * + Docs scopes have been granted. Blocks all dashboard access.
 *
 * Behavior:
 *  - If the user previously granted Drive (localStorage flag), attempts a
 *    silent re-auth automatically on mount. If the popup is closed/blocked,
 *    surfaces a manual retry button.
 *  - If first-time user, shows a clear value-proposition screen + Connect button.
 */
const DriveAccessGate = () => {
  const {
    reconnectGoogleDrive,
    driveAuthState,
    driveAuthError,
    wasDriveGrantedBefore,
    signOut,
    user,
  } = useAuth();

  const [retryCount, setRetryCount] = useState(0);
  const autoTriedRef = useRef(false);

  // Silent auto re-acquire on first mount if user previously granted.
  useEffect(() => {
    if (autoTriedRef.current) return;
    if (!wasDriveGrantedBefore) return;
    autoTriedRef.current = true;
    reconnectGoogleDrive().catch(() => {
      // failure is fine — UI falls back to manual retry
    });
  }, [wasDriveGrantedBefore, reconnectGoogleDrive]);

  const handleConnect = async () => {
    setRetryCount((c) => c + 1);
    try {
      await reconnectGoogleDrive();
    } catch {
      // surfaced via driveAuthError
    }
  };

  const isConnecting = driveAuthState === 'connecting';
  const hasError = driveAuthState === 'error' || driveAuthState === 'denied';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-neutral-200 p-8">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mx-auto mb-5">
          <Cloud className="w-8 h-8 text-blue-600" />
        </div>

        <h1 className="text-2xl font-semibold text-neutral-900 text-center mb-2">
          Connect Google Drive
        </h1>
        <p className="text-sm text-neutral-600 text-center mb-6">
          Your resumes live as real Google Docs in your Drive. We need permission
          to create and edit files in a dedicated <span className="font-medium">ResumeAI</span> folder.
        </p>

        <div className="space-y-2.5 mb-6 text-sm">
          <div className="flex items-start gap-2.5 text-neutral-700">
            <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <span>We only access files we create — never your other documents.</span>
          </div>
          <div className="flex items-start gap-2.5 text-neutral-700">
            <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <span>Edit, export, and share using all of Google Docs' tools.</span>
          </div>
          <div className="flex items-start gap-2.5 text-neutral-700">
            <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <span>You can revoke access anytime from your Google Account.</span>
          </div>
        </div>

        {hasError && driveAuthError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex gap-2 text-sm text-red-800">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{driveAuthError}</span>
          </div>
        )}

        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-60 flex items-center justify-center gap-2 transition-all"
        >
          {isConnecting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Connecting to Google…
            </>
          ) : retryCount > 0 ? (
            <>
              <RefreshCw className="w-4 h-4" />
              Try again
            </>
          ) : (
            <>
              <Cloud className="w-4 h-4" />
              Connect Google Drive
            </>
          )}
        </button>

        {retryCount >= 2 && (
          <p className="mt-3 text-xs text-neutral-500 text-center">
            Popup blocked? Click the lock icon in the address bar and allow popups,
            then try again.
          </p>
        )}

        <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
          <span className="truncate">{user?.email}</span>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-1 text-neutral-600 hover:text-neutral-900"
          >
            <LogOut className="w-3 h-3" /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
};

export default DriveAccessGate;
