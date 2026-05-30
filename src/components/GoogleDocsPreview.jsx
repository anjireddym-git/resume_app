import React, { useState } from 'react';
import { ExternalLink, Cloud, Loader2, RefreshCw } from 'lucide-react';
import { getEmbedPreviewUrl, getEmbedEditUrl, getOpenInDocsUrl } from '../services/googleDriveService';

/**
 * GoogleDocsPreview — embeds a Google Doc inside an iframe.
 *
 * Props:
 *   fileId         – Google Drive file id (Google Doc). When null, shows empty state.
 *   mode           – 'preview' (read-only) or 'edit' (full Docs editor in iframe).
 *   onSync         – optional callback invoked when the user clicks "Sync now" in the empty state.
 *   isSyncing      – external syncing-in-progress flag (shows spinner).
 */
const GoogleDocsPreview = ({ fileId, mode = 'preview', onSync, isSyncing = false }) => {
  const [iframeKey, setIframeKey] = useState(0);
  const [loaded, setLoaded] = useState(false);

  if (!fileId) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-neutral-50 text-center p-8">
        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
          <Cloud className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-neutral-800 mb-2">
          Not synced to Google Drive yet
        </h3>
        <p className="text-sm text-neutral-500 max-w-sm mb-6">
          Sync this resume to your Google Drive to view and edit it as a live Google Doc here.
        </p>
        {onSync && (
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-all"
          >
            {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
            {isSyncing ? 'Syncing...' : 'Sync to Google Drive'}
          </button>
        )}
      </div>
    );
  }

  const src = mode === 'edit' ? getEmbedEditUrl(fileId) : getEmbedPreviewUrl(fileId);

  return (
    <div className="relative w-full h-full bg-neutral-100">
      {/* Toolbar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 py-2 bg-white/95 backdrop-blur border-b border-neutral-200">
        <div className="text-xs text-neutral-500 flex items-center gap-1.5">
          <Cloud className="w-3.5 h-3.5" />
          <span>{mode === 'edit' ? 'Editing in Google Docs' : 'Live Google Doc preview'}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setLoaded(false); setIframeKey((k) => k + 1); }}
            className="p-1.5 text-neutral-500 hover:bg-neutral-100 rounded transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <a
            href={getOpenInDocsUrl(fileId)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-neutral-500 hover:bg-neutral-100 rounded transition-colors"
            title="Open in Google Docs"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Loading overlay */}
      {!loaded && (
        <div className="absolute inset-0 top-10 flex items-center justify-center bg-neutral-50">
          <Loader2 className="w-6 h-6 text-neutral-400 animate-spin" />
        </div>
      )}

      <iframe
        key={iframeKey}
        src={src}
        title="Google Docs preview"
        className="w-full h-full pt-10 border-0"
        onLoad={() => setLoaded(true)}
        allow="autoplay"
      />
    </div>
  );
};

export default GoogleDocsPreview;
