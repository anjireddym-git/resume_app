import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Sparkles, X } from 'lucide-react';

/**
 * AIPromptModal
 *
 * Modal dialog for AI field rewrites. Unlike window.prompt, this stays
 * mounted throughout the AI call so the user sees a real loading state
 * until the response actually arrives. The parent owns the async work
 * and passes `busy`; the modal only closes when the parent calls onClose
 * (typically after the await resolves).
 */
const AIPromptModal = ({
  isOpen,
  fieldLabel,
  currentValue,
  defaultPrompt = '',
  busy = false,
  error = '',
  onSubmit,
  onClose,
}) => {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPrompt(defaultPrompt);
      // Focus after the modal mounts.
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, defaultPrompt]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    if (busy) return;
    const trimmed = (prompt || '').trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={() => !busy && onClose?.()}
    >
      <div
        className="w-full max-w-lg bg-white rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <h3 className="text-sm font-semibold text-neutral-900">
              Edit with AI{fieldLabel ? ` — ${fieldLabel}` : ''}
            </h3>
          </div>
          <button
            onClick={() => !busy && onClose?.()}
            disabled={busy}
            className="p-1 rounded hover:bg-neutral-100 disabled:opacity-40"
            title="Close"
          >
            <X className="w-4 h-4 text-neutral-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {currentValue !== undefined && (
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1">
                Current text
              </label>
              <div className="p-2 bg-neutral-50 border border-neutral-200 rounded text-xs text-neutral-700 max-h-32 overflow-auto whitespace-pre-wrap">
                {currentValue || <span className="text-neutral-400">(empty)</span>}
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1">
              Instruction
            </label>
            <textarea
              ref={inputRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={busy}
              rows={3}
              placeholder="e.g. Make it more concise and impactful"
              className="w-full px-2 py-1.5 text-sm border border-neutral-300 rounded focus:outline-none focus:border-blue-500 disabled:bg-neutral-50 disabled:text-neutral-400"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
              {error}
            </p>
          )}

          {busy && (
            <div className="flex items-center gap-2 text-sm text-neutral-600 bg-blue-50 border border-blue-200 rounded px-3 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span>Generating with AI… please wait.</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => !busy && onClose?.()}
              disabled={busy}
              className="px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100 rounded disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !prompt.trim()}
              className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-500 disabled:bg-neutral-300 disabled:text-neutral-500 flex items-center gap-1.5"
            >
              {busy ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Working…
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Apply
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AIPromptModal;
