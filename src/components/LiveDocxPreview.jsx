import React, { useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle, FileText } from 'lucide-react';
import { renderDocx } from '../services/docxPreviewService';

/**
 * LiveDocxPreview
 *
 * Renders the current DOCX blob inside a scrollable container using
 * docx-preview. Re-renders whenever the blob reference changes; debounced to
 * avoid thrashing during rapid edits.
 */
const LiveDocxPreview = ({ blob, debounceMs = 200 }) => {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!blob || !containerRef.current) return;
    let cancelled = false;
    setError(null);
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        await renderDocx(blob, containerRef.current);
      } catch (e) {
        if (!cancelled) setError(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, debounceMs);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [blob, debounceMs]);

  if (!blob) {
    return (
      <div className="h-full flex items-center justify-center bg-neutral-700 rounded-lg">
        <div className="text-center text-neutral-400">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No DOCX loaded</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-neutral-700 rounded-lg overflow-hidden relative">
      {loading && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-2 bg-neutral-800/80 text-neutral-200 text-xs px-2 py-1 rounded">
          <Loader2 className="w-3 h-3 animate-spin" />
          Updating preview…
        </div>
      )}
      {error && (
        <div className="absolute top-2 left-2 right-2 z-10 flex items-start gap-2 bg-red-900/80 text-red-100 text-xs p-2 rounded">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-neutral-200 p-4"
        style={{ minHeight: 0 }}
      />
    </div>
  );
};

export default LiveDocxPreview;
