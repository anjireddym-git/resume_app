import React, { useState, useRef, useEffect } from 'react';
import { Check, X, Plus, Trash2 } from 'lucide-react';

/**
 * EditableListItem - Inline-editable bullet item used inside the
 * LayoutPreservingTemplate. Renders a single line of text with the
 * configured bullet symbol; click to edit; Enter saves, Shift+Enter adds
 * a new sibling, Backspace on empty value removes the item, Escape cancels.
 *
 * Props:
 *   value:     string
 *   onSave:    (newValue: string) => void
 *   onRemove:  () => void
 *   onAddAfter:() => void
 *   bullet:    string (e.g. '•')
 *   className: string  (applied to the rendered text span)
 *   editable:  boolean
 */
const EditableListItem = ({
  value,
  onSave,
  onRemove,
  onAddAfter,
  bullet = '•',
  className = '',
  editable = true,
  placeholder = 'Click to add a bullet…',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const inputRef = useRef(null);

  useEffect(() => { setEditValue(value || ''); }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Auto-grow to content height
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
    }
  }, [isEditing]);

  const commit = () => {
    setIsEditing(false);
    if (editValue !== (value || '')) onSave(editValue);
  };

  const cancel = () => {
    setIsEditing(false);
    setEditValue(value || '');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commit();
      if (onAddAfter) onAddAfter();
    } else if (e.key === 'Enter' && e.shiftKey) {
      // Allow newline inside the bullet
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    } else if (e.key === 'Backspace' && editValue === '') {
      e.preventDefault();
      if (onRemove) onRemove();
    }
  };

  if (!editable) {
    return (
      <div className={`flex gap-2 items-start ${className}`}>
        <span className="select-none" aria-hidden>{bullet}</span>
        <span className="whitespace-pre-wrap break-words">{value}</span>
      </div>
    );
  }

  return (
    <div className="group flex gap-2 items-start relative">
      <span className="select-none mt-[2px]" aria-hidden>{bullet}</span>
      {isEditing ? (
        <textarea
          ref={inputRef}
          value={editValue}
          onChange={(e) => {
            setEditValue(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          rows={1}
          className={`flex-1 border border-blue-400 rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${className}`}
        />
      ) : (
        <span
          onClick={() => setIsEditing(true)}
          className={`flex-1 cursor-text hover:bg-blue-50 hover:outline hover:outline-1 hover:outline-blue-300 rounded px-0.5 ${className}`}
          title="Click to edit"
        >
          {value || <span className="text-gray-400 italic">{placeholder}</span>}
        </span>
      )}

      {/* Hover controls */}
      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity absolute right-0 top-0 -translate-y-full bg-white border border-neutral-200 rounded shadow-sm px-1 py-0.5 z-10">
        {isEditing && (
          <>
            <button onClick={commit}  className="p-0.5 text-green-600 hover:bg-green-100 rounded" title="Save"  ><Check className="w-3 h-3" /></button>
            <button onClick={cancel}  className="p-0.5 text-red-600   hover:bg-red-100   rounded" title="Cancel"><X      className="w-3 h-3" /></button>
          </>
        )}
        {onAddAfter && (
          <button onClick={() => onAddAfter()} className="p-0.5 text-blue-600 hover:bg-blue-100 rounded" title="Add bullet below"><Plus className="w-3 h-3" /></button>
        )}
        {onRemove && (
          <button onClick={() => onRemove()} className="p-0.5 text-red-600 hover:bg-red-100 rounded" title="Remove bullet"><Trash2 className="w-3 h-3" /></button>
        )}
      </div>
    </div>
  );
};

export default EditableListItem;
