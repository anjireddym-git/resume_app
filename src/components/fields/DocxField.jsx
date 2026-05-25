import React, { useState, useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';

/**
 * DocxField — generic editable field bound to a single fieldId in the
 * useDocxResume hook. The component is mode-aware:
 *   - "text":      single-line input
 *   - "multiline": auto-growing textarea
 *   - "bullet":    bullet-prefixed textarea (renders a leading "• ")
 *
 * Edits are committed on blur to avoid re-zipping the DOCX on every
 * keystroke. The Sparkles button triggers the parent-provided onAIEdit.
 */
const DocxField = ({
  fieldId,
  label,
  value,
  mode = 'text',
  onCommit,
  onAIEdit,
  className = '',
}) => {
  const [draft, setDraft] = useState(value ?? '');
  const ref = useRef(null);

  useEffect(() => {
    setDraft(value ?? '');
  }, [value]);

  const commit = () => {
    if ((draft ?? '') !== (value ?? '')) {
      onCommit?.(fieldId, draft);
    }
  };

  const isMulti = mode === 'multiline' || mode === 'bullet';

  return (
    <div className={`group flex items-start gap-2 py-1 ${className}`}>
      {mode === 'bullet' && (
        <span className="text-neutral-400 mt-1 select-none">•</span>
      )}
      <div className="flex-1">
        {label && (
          <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-0.5">
            {label}
          </label>
        )}
        {isMulti ? (
          <textarea
            ref={ref}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            rows={Math.max(1, Math.ceil((draft?.length || 1) / 80))}
            className="w-full bg-transparent border-b border-transparent hover:border-neutral-600 focus:border-blue-500 focus:outline-none text-sm text-neutral-100 resize-none"
          />
        ) : (
          <input
            ref={ref}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            className="w-full bg-transparent border-b border-transparent hover:border-neutral-600 focus:border-blue-500 focus:outline-none text-sm text-neutral-100"
          />
        )}
      </div>
      {onAIEdit && (
        <button
          type="button"
          title="Edit with AI"
          onClick={() => onAIEdit(fieldId, draft)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-purple-400 hover:text-purple-300"
        >
          <Sparkles className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default DocxField;
