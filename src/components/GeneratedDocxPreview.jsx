import React, { useEffect, useState } from 'react';
import { AlertCircle, FileText, Loader2 } from 'lucide-react';
import LiveDocxPreview from './LiveDocxPreview';
import { generateDocxBlob } from '../services/exportService';

const GeneratedDocxPreview = ({ resumeData, renderOptions, debounceMs = 250 }) => {
  const [blob, setBlob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!resumeData) {
      setBlob(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const nextBlob = await generateDocxBlob(resumeData, renderOptions);
        if (!cancelled) setBlob(nextBlob);
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Could not render DOCX preview.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, debounceMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [resumeData, renderOptions, debounceMs]);

  if (!resumeData) {
    return (
      <div className="h-full flex items-center justify-center bg-neutral-50 text-neutral-400">
        <div className="text-center">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No resume data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-0 bg-neutral-100">
      {loading && (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2 rounded bg-neutral-900/80 px-2 py-1 text-xs text-white">
          <Loader2 className="h-3 w-3 animate-spin" />
          Rendering DOCX
        </div>
      )}
      {error && (
        <div className="absolute left-3 right-3 top-3 z-20 flex items-start gap-2 rounded bg-red-900/85 p-2 text-xs text-red-50">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <LiveDocxPreview blob={blob} debounceMs={0} />
    </div>
  );
};

export default GeneratedDocxPreview;
