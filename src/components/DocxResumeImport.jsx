import React, { useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { parseDocxToFieldMap } from '../services/documentParser';

/**
 * DocxResumeImport
 *
 * Accepts a .docx upload, sends it to the parseDocxToFieldMap Cloud Function,
 * and emits both the original blob and the parsed field map to the parent
 * via onImport(blob, fieldMap).
 */
const DocxResumeImport = ({ onImport, disabled }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.docx')) {
      setError('Only .docx files are supported. Please save your resume as DOCX and try again.');
      e.target.value = '';
      return;
    }
    setIsImporting(true);
    setError('');
    try {
      const fieldMap = await parseDocxToFieldMap(file);
      // The original file is itself a valid Blob — pass it through.
      const blob = new Blob([await file.arrayBuffer()], {
        type:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      onImport(blob, fieldMap, file.name.replace(/\.docx$/i, ''));
    } catch (err) {
      console.error('Import failed:', err);
      setError(err.message || 'Failed to import resume.');
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-4">
      <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3 block">
        Import DOCX Resume
      </label>
      <label
        className={`flex items-center justify-center gap-2 h-10 px-4 border border-dashed border-neutral-300 rounded-lg text-sm text-neutral-600 cursor-pointer hover:border-neutral-400 hover:bg-neutral-50 transition-all ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {isImporting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Parsing DOCX…</span>
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            <span>Upload .docx</span>
          </>
        )}
        <input
          type="file"
          accept=".docx"
          onChange={handleFileUpload}
          disabled={disabled || isImporting}
          className="hidden"
        />
      </label>
      <p className="text-[10px] text-neutral-400 mt-2">
        PDF import is no longer supported — convert to DOCX first.
      </p>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
};

export default DocxResumeImport;
