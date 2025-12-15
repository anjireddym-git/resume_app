import React from 'react';
import { Loader2 } from 'lucide-react';

const JobDescriptionInput = ({
  value,
  onChange,
  onCheckMatch,
  onUpdateWithAI,
  isLoading,
  isAnalyzing,
  error,
  apiKeySet,
}) => {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-4">
      <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3 block">
        Job Description
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste the job description here..."
        className="w-full h-40 p-3 text-sm border border-neutral-200 rounded-lg resize-none focus:outline-none focus:border-neutral-400 placeholder:text-neutral-400"
      />
      
      {error && (
        <p className="mt-2 text-xs text-red-500">{error}</p>
      )}

      <div className="flex gap-2 mt-3">
        <button
          onClick={onCheckMatch}
          disabled={!apiKeySet || isAnalyzing || !value.trim()}
          className="flex-1 h-9 px-4 bg-white border border-neutral-200 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
        >
          {isAnalyzing && !isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          Check Match
        </button>
        <button
          onClick={onUpdateWithAI}
          disabled={!apiKeySet || isLoading || !value.trim()}
          className="flex-1 h-9 px-4 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          Optimize
        </button>
      </div>
    </div>
  );
};

export default JobDescriptionInput;
