import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Save, Undo2, Redo2, Loader2 } from 'lucide-react';
import DocxField from './fields/DocxField';
import AIPromptModal from './AIPromptModal';
import { geminiService } from '../services/geminiService';

/**
 * DocxResumeEditor
 *
 * Field-map-driven editor. Renders the sections discovered during DOCX
 * parsing, and inside each section groups fields by `itemIndex` (so each
 * experience/education entry shows its sub-fields together). Section headers
 * detected during parsing (e.g. the literal "EXPERIENCE" paragraph) are kept
 * as read-only labels, not editable inputs.
 *
 * All edits flow through `onCommit(fieldId, newValue)` provided by the
 * parent (typically the useDocxResume hook's `updateField`).
 */
const Section = ({ title, count, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-neutral-800">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-neutral-800/50"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-neutral-100">{title}</span>
          {count !== undefined && count > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] bg-neutral-700 text-neutral-300 rounded">
              {count}
            </span>
          )}
        </div>
        {open ? (
          <ChevronDown className="w-4 h-4 text-neutral-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-neutral-400" />
        )}
      </button>
      {open && <div className="px-3 pb-3 space-y-2">{children}</div>}
    </div>
  );
};

// Map a parsed `fieldType` string to the rendering mode used by DocxField.
function modeForFieldType(fieldType) {
  if (!fieldType) return 'text';
  const t = String(fieldType).toLowerCase();
  if (t === 'highlight') return 'bullet';
  if (t === 'summary' || t === 'description' || t === 'skill-line') return 'multiline';
  return 'text';
}

// Pretty section label fallback when no sections array provided by AI.
const FALLBACK_LABELS = {
  header: 'Header',
  summary: 'Professional Summary',
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  certifications: 'Certifications',
  unknown: 'Other',
};

const DocxResumeEditor = ({
  sections,
  groupedFields,
  onCommit,
  onSave,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  dirty,
  loading,
}) => {
  const [aiBusy, setAiBusy] = useState(null);
  // Pending AI edit: { fieldId, fieldType, currentValue, label }. When set,
  // the modal stays open until the request resolves; we only clear it after
  // onCommit applies the new value.
  const [aiTarget, setAiTarget] = useState(null);
  const [aiError, setAiError] = useState('');

  // Determine section order. Use the parser-provided `sections` array; append
  // any sections that exist in groupedFields but weren't listed.
  const orderedSections = useMemo(() => {
    const listed = (sections || []).map((s) => s.id);
    const fromFields = Object.keys(groupedFields || {});
    const extras = fromFields.filter((id) => !listed.includes(id));
    const all = [...listed, ...extras];
    return all.map((id) => {
      const known = (sections || []).find((s) => s.id === id);
      return {
        id,
        label: known?.label || FALLBACK_LABELS[id] || id,
        type: known?.type || id,
      };
    });
  }, [sections, groupedFields]);

  const openAIEdit = (fieldId, currentValue, fieldType, label) => {
    setAiError('');
    setAiTarget({ fieldId, currentValue, fieldType, label });
  };

  const handleAISubmit = async (userPrompt) => {
    if (!aiTarget) return;
    const { fieldId, currentValue, fieldType } = aiTarget;
    setAiBusy(fieldId);
    setAiError('');
    try {
      const result = await geminiService.editFieldWithAI(
        currentValue,
        userPrompt,
        fieldType
      );
      const newValue =
        typeof result === 'string' ? result : result?.text || result?.value;
      if (!newValue) {
        throw new Error('AI returned an empty response.');
      }
      // Apply the edit BEFORE closing so the user sees the change land.
      onCommit(fieldId, newValue);
      setAiTarget(null);
    } catch (e) {
      // Keep modal open and show the error inline.
      setAiError(e?.message || String(e));
    } finally {
      setAiBusy(null);
    }
  };

  const handleAIClose = () => {
    // Block close while a request is in flight so the user can't lose the
    // response.
    if (aiBusy) return;
    setAiTarget(null);
    setAiError('');
  };

  return (
    <div className="h-full flex flex-col bg-neutral-900 text-neutral-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800">
        <div className="flex items-center gap-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded hover:bg-neutral-800 disabled:opacity-30"
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded hover:bg-neutral-800 disabled:opacity-30"
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={onSave}
          disabled={!dirty || loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-700 disabled:text-neutral-500"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {dirty ? 'Save changes' : 'Saved'}
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {orderedSections.length === 0 && (
          <div className="p-6 text-sm text-neutral-400">
            No fields detected. Try re-importing the DOCX.
          </div>
        )}
        {orderedSections.map((section) => {
          const items = groupedFields[section.id] || {};
          const itemKeys = Object.keys(items).sort((a, b) => Number(a) - Number(b));
          // Count editable fields (exclude section-headers).
          const fieldCount = itemKeys.reduce((acc, k) => {
            return acc + items[k].filter((f) => f.fieldType !== 'section-header').length;
          }, 0);
          return (
            <Section key={section.id} title={section.label} count={fieldCount}>
              {itemKeys.map((itemKey) => {
                const fields = items[itemKey].filter((f) => f.fieldType !== 'section-header');
                if (fields.length === 0) return null;
                const isRepeating = Number(itemKey) >= 0;
                return (
                  <div
                    key={`${section.id}-${itemKey}`}
                    className={`${isRepeating ? 'border border-neutral-800 rounded p-2 bg-neutral-850' : ''}`}
                  >
                    {isRepeating && (
                      <div className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1">
                        Item {Number(itemKey) + 1}
                      </div>
                    )}
                    {fields.map((f) => (
                      <DocxField
                        key={f.id}
                        fieldId={f.id}
                        label={prettyLabel(f.fieldType)}
                        value={f.value}
                        mode={modeForFieldType(f.fieldType)}
                        onCommit={onCommit}
                        onAIEdit={(id, v) =>
                          openAIEdit(id, v, f.fieldType, prettyLabel(f.fieldType))
                        }
                        className={aiBusy === f.id ? 'opacity-60' : ''}
                      />
                    ))}
                  </div>
                );
              })}
            </Section>
          );
        })}
      </div>

      <AIPromptModal
        isOpen={!!aiTarget}
        fieldLabel={aiTarget?.label}
        currentValue={aiTarget?.currentValue}
        defaultPrompt="Make it more concise and impactful"
        busy={!!aiBusy}
        error={aiError}
        onSubmit={handleAISubmit}
        onClose={handleAIClose}
      />
    </div>
  );
};

function prettyLabel(fieldType) {
  if (!fieldType) return '';
  return String(fieldType)
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default DocxResumeEditor;
