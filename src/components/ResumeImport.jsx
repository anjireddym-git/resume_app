import React, { useState } from 'react';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { extractResumeFromFile } from '../services/documentParser';

const ResumeImport = ({ onImport, geminiService, disabled }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type - PDF and DOCX supported
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.pdf') && !fileName.endsWith('.docx')) {
      setError('Please upload a PDF or DOCX file');
      return;
    }

    setIsImporting(true);
    setError('');
    try {
      // New shape: { content, layout }. Pass both upward so callers that care
      // about layout can use it; back-compat callers can ignore `layout`.
      const parsed = await extractResumeFromFile(geminiService, file);
      onImport(parsed.content, parsed.layout);
    } catch (error) {
      console.error('Import failed:', error);
      setError(error.message || 'Failed to import resume. Please try again.');
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-4">
      <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3 block">
        Import Resume
      </label>
      <label
        className={`flex items-center justify-center gap-2 h-10 px-4 border border-dashed border-neutral-300 rounded-lg text-sm text-neutral-600 cursor-pointer hover:border-neutral-400 hover:bg-neutral-50 transition-all ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {isImporting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Importing...</span>
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            <span>Upload Resume</span>
          </>
        )}
        <input
          type="file"
          accept=".pdf,.docx"
          onChange={handleFileUpload}
          disabled={disabled || isImporting}
          className="hidden"
        />
      </label>
      {error && (
        <p className="text-xs text-red-500 mt-2">{error}</p>
      )}
    </div>
  );
};

export default ResumeImport;
