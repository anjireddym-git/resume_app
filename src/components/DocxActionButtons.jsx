import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { saveAs } from 'file-saver';

/**
 * DocxActionButtons
 *
 * In the DOCX-native pipeline, export is a passthrough: the current blob is
 * already a valid .docx with layout preserved, so we just save it. PDF export
 * is deferred (would require a Cloud Run pandoc/LibreOffice service).
 */
const DocxActionButtons = ({ blob, fileNameBase = 'Resume' }) => {
  const [busy, setBusy] = useState(false);

  const handleDownloadDocx = async () => {
    if (!blob) return;
    setBusy(true);
    try {
      const name = (fileNameBase || 'Resume').replace(/[^a-zA-Z0-9_-]+/g, '_');
      saveAs(blob, `${name}.docx`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleDownloadDocx}
        disabled={!blob || busy}
        className="h-9 px-3 md:px-4 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 flex items-center gap-2"
        title="Download DOCX"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        <span className="hidden sm:inline">DOCX</span>
      </button>
      <span
        className="text-[10px] text-neutral-500"
        title="PDF export from DOCX requires a server-side renderer; coming soon."
      >
        PDF export coming soon
      </span>
    </div>
  );
};

export default DocxActionButtons;
