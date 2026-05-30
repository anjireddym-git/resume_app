import React, { useEffect, useRef, useState } from 'react';
import { Brain, CheckCircle2, AlertTriangle, Loader2, Pause, Play } from 'lucide-react';

/**
 * Live thinking / status pane for the streaming AI agent (Approach B).
 *
 * Props:
 *   thoughts      string[]   accumulated thought-summary chunks (in order)
 *   answerPreview string     accumulated answer-JSON text so far
 *   usage         object?    latest { thoughtsTokens, candidatesTokens, totalTokens }
 *   status        string?    'idle' | 'thinking' | 'writing' | 'validating' | 'done' | 'error'
 *   elapsedMs     number?
 *   validator     { ok, issues[] } | null
 *   model         string?
 *   error         string?
 */
const AgentThinkingPane = ({
  thoughts = [],
  answerPreview = '',
  usage = null,
  status = 'idle',
  elapsedMs = 0,
  validator = null,
  model = '',
  error = '',
}) => {
  const scrollRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thoughts, autoScroll]);

  const elapsedSec = Math.floor(elapsedMs / 1000);
  const isActive = status === 'thinking' || status === 'writing' || status === 'validating';

  const statusLabel = {
    idle: 'Idle',
    thinking: 'Thinking…',
    writing: 'Writing resume…',
    validating: 'Validating…',
    done: 'Done',
    error: 'Failed',
  }[status] || status;

  return (
    <div className="flex flex-col h-full bg-white border border-neutral-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between gap-3 bg-neutral-50">
        <div className="flex items-center gap-2 min-w-0">
          {isActive ? (
            <Loader2 className="w-4 h-4 text-neutral-700 animate-spin flex-shrink-0" />
          ) : status === 'done' ? (
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
          ) : status === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          ) : (
            <Brain className="w-4 h-4 text-neutral-500 flex-shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-neutral-900 truncate">AI Agent · {statusLabel}</p>
            {model && (
              <p className="text-xs text-neutral-500 truncate">{model}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-neutral-500 whitespace-nowrap">
          {usage && (
            <span title="Tokens used">
              {usage.thoughtsTokens ? `🧠 ${usage.thoughtsTokens}` : ''}{' '}
              {usage.candidatesTokens ? `· ✍ ${usage.candidatesTokens}` : ''}
            </span>
          )}
          <span>{elapsedSec}s</span>
          <button
            type="button"
            onClick={() => setAutoScroll((v) => !v)}
            className="p-1 rounded hover:bg-neutral-200 text-neutral-500"
            title={autoScroll ? 'Pause autoscroll' : 'Resume autoscroll'}
          >
            {autoScroll ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Thought stream */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 text-sm text-neutral-700 font-mono leading-relaxed whitespace-pre-wrap">
        {thoughts.length === 0 && !error && (
          <p className="text-neutral-400 italic font-sans">
            Waiting for the agent to start thinking…
          </p>
        )}
        {thoughts.map((t, i) => (
          <div key={i} className="mb-3">{t}</div>
        ))}
        {error && (
          <div className="mt-3 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-xs font-sans">
            {error}
          </div>
        )}
        {validator && !validator.ok && (
          <div className="mt-3 p-3 rounded border border-amber-200 bg-amber-50 text-amber-800 text-xs font-sans">
            <p className="font-semibold mb-1">Truthfulness check failed:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {validator.issues.slice(0, 8).map((iss, i) => <li key={i}>{iss}</li>)}
            </ul>
          </div>
        )}
        {validator && validator.ok && status === 'done' && (
          <div className="mt-3 p-3 rounded border border-green-200 bg-green-50 text-green-700 text-xs font-sans flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Output passed the truthfulness check.
          </div>
        )}
      </div>

      {/* Answer preview tail */}
      {answerPreview && (
        <details className="border-t border-neutral-200 bg-neutral-50">
          <summary className="px-4 py-2 text-xs text-neutral-500 cursor-pointer hover:text-neutral-700">
            Show streaming JSON ({answerPreview.length.toLocaleString()} chars)
          </summary>
          <pre className="max-h-40 overflow-auto p-3 text-[11px] text-neutral-600 font-mono">
            {answerPreview.slice(-2000)}
          </pre>
        </details>
      )}
    </div>
  );
};

export default AgentThinkingPane;
