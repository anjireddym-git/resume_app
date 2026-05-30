import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2, X, GripVertical, ChevronUp, Edit2, List, AlignLeft, LayoutList, Tags, Columns2, FileText, Layers, AlignCenter, AlignJustify, Rows3, Wand2, Sparkles, Loader2 } from 'lucide-react';
import { SECTION_FORMATS } from '../config/sectionFormats';
import { geminiService } from '../services/geminiService';

// Icon mapping for format buttons
const ICON_MAP = {
  AlignLeft, List, LayoutList, Tags, Columns2, FileText, Layers, AlignCenter, AlignJustify, Rows3
};

// Format selector component for each section
const FormatSelector = ({ sectionId, currentFormat, onFormatChange }) => {
  const sectionConfig = SECTION_FORMATS[sectionId];
  if (!sectionConfig) return null;
  
  const formats = Object.values(sectionConfig.formats);
  
  return (
    <div className="flex items-center gap-1 bg-neutral-100 rounded p-0.5">
      {formats.map((format) => {
        const IconComponent = ICON_MAP[format.icon] || AlignLeft;
        const isActive = currentFormat === format.id;
        return (
          <button
            key={format.id}
            onClick={() => onFormatChange(sectionId, format.id)}
            title={format.description}
            className={`p-1 rounded text-xs flex items-center gap-1 transition-all ${
              isActive 
                ? 'bg-white shadow-sm text-neutral-700' 
                : 'text-neutral-400 hover:text-neutral-600'
            }`}
          >
            <IconComponent className="w-3 h-3" />
            <span className="hidden sm:inline">{format.label}</span>
          </button>
        );
      })}
    </div>
  );
};

// Collapsible section wrapper
const Section = ({ title, children, defaultOpen = false, count }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border-b border-neutral-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-neutral-50"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-neutral-900">{title}</span>
          {count !== undefined && count > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-neutral-100 text-neutral-500 rounded">
              {count}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-neutral-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-neutral-400" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-3 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
};

// Compact inline input
const InlineInput = ({ value, onChange, placeholder, className = "" }) => (
  <input
    type="text"
    value={value || ''}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className={`text-xs text-neutral-700 bg-transparent border-0 border-b border-transparent hover:border-neutral-200 focus:border-neutral-400 focus:outline-none py-0.5 transition-colors ${className}`}
  />
);

// Minimalistic row component for list items
const MinimalRow = ({ children, onRemove, onMoveUp, onMoveDown, isFirst, isLast }) => (
  <div className="group flex items-start gap-2 py-1.5 border-b border-neutral-100 last:border-0">
    <div className="flex flex-col gap-0 pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
      <button onClick={onMoveUp} disabled={isFirst} className="p-0.5 text-neutral-300 hover:text-neutral-500 disabled:opacity-20">
        <ChevronUp className="w-3 h-3" />
      </button>
      <button onClick={onMoveDown} disabled={isLast} className="p-0.5 text-neutral-300 hover:text-neutral-500 disabled:opacity-20">
        <ChevronDown className="w-3 h-3" />
      </button>
    </div>
    <div className="flex-1 min-w-0">{children}</div>
    <button onClick={onRemove} className="p-1 text-neutral-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
      <Trash2 className="w-3 h-3" />
    </button>
  </div>
);

// Expandable row for items with more details
const ExpandableRow = ({ title, subtitle, isExpanded, onToggle, children, onRemove, onMoveUp, onMoveDown, isFirst, isLast }) => (
  <div className="group border-b border-neutral-100 last:border-0">
    <div className="flex items-center gap-2 py-1.5">
      <div className="flex flex-col gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onMoveUp} disabled={isFirst} className="p-0.5 text-neutral-300 hover:text-neutral-500 disabled:opacity-20">
          <ChevronUp className="w-3 h-3" />
        </button>
        <button onClick={onMoveDown} disabled={isLast} className="p-0.5 text-neutral-300 hover:text-neutral-500 disabled:opacity-20">
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>
      <button onClick={onToggle} className="flex-1 flex items-center gap-2 text-left min-w-0">
        {isExpanded ? <ChevronDown className="w-3 h-3 text-neutral-400 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 text-neutral-400 flex-shrink-0" />}
        <span className="text-xs font-medium text-neutral-700 truncate">{title || 'Untitled'}</span>
        {subtitle && <span className="text-xs text-neutral-400 truncate hidden sm:inline">· {subtitle}</span>}
      </button>
      <button onClick={onRemove} className="p-1 text-neutral-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
    {isExpanded && (
      <div className="pl-8 pr-2 pb-2 space-y-2">
        {children}
      </div>
    )}
  </div>
);

// AI Edit Modal
const AIEditModal = ({ isOpen, onClose, onConfirm, initialValue, fieldType }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const result = await geminiService.editFieldWithAI(initialValue, prompt, fieldType);
      setPreview(result);
    } catch (error) {
      alert(error.message); // Simple error handling for now
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (preview) {
      onConfirm(preview);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <h3 className="font-semibold text-neutral-800">Edit with AI</h3>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-500">Original Text</label>
            <div className="bg-neutral-50 p-2 rounded border border-neutral-100 text-xs text-neutral-600 max-h-24 overflow-y-auto">
              {initialValue || <em className="text-neutral-400">Empty</em>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-neutral-700">How should we change it?</label>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., Make it more concise, Add metrics, Fix grammar..."
                className="w-full text-sm border border-neutral-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                rows={3}
                autoFocus
              />
              <div className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] text-neutral-400">
                <Sparkles className="w-3 h-3" />
                <span>1 Credit</span>
              </div>
            </div>
          </div>

          {preview && (
            <div className="space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <label className="text-xs font-medium text-purple-600">Preview</label>
              <div className="bg-purple-50 p-3 rounded border border-purple-100 text-sm text-neutral-800">
                {preview}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-neutral-100 flex justify-end gap-2 bg-neutral-50/50">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 rounded"
          >
            Cancel
          </button>
          {preview ? (
            <button
              onClick={handleApply}
              className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded shadow-sm flex items-center gap-1.5"
            >
              Apply Change
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="px-3 py-1.5 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed rounded shadow-sm flex items-center gap-1.5"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
              Generate
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Compact resizable text input (auto-grows with content, manually resizable)
const CompactInput = ({ label, value, onChange, placeholder, multiline = false, enableAI = false, fieldType = 'general' }) => {
  const [showAI, setShowAI] = useState(false);

  // Auto-resize handler
  const handleInput = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = Math.max(e.target.scrollHeight, 26) + 'px';
  };
  
  return (
    <div className="flex items-start gap-2 group/input relative">
      <label className="text-xs text-neutral-400 w-20 flex-shrink-0 pt-1">{label}</label>
      <div className="flex-1 relative">
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          onInput={handleInput}
          placeholder={placeholder}
          rows={1}
          className="w-full text-xs text-neutral-700 border border-neutral-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-neutral-300 resize-y min-h-[26px] pr-8"
        />
        {enableAI && (
          <button 
            onClick={() => setShowAI(true)}
            className="absolute right-1 top-1 p-0.5 text-neutral-300 hover:text-purple-600 opacity-0 group-hover/input:opacity-100 transition-all hover:bg-purple-50 rounded"
            title="Edit with AI"
          >
            <Wand2 className="w-3 h-3" />
          </button>
        )}
      </div>
      {showAI && (
        <AIEditModal
          isOpen={showAI}
          onClose={() => setShowAI(false)}
          onConfirm={(newValue) => onChange(newValue)}
          initialValue={value}
          fieldType={fieldType}
        />
      )}
    </div>
  );
};

// Compact resizable textarea (auto-grows with content, manually resizable)
const CompactTextarea = ({ label, value, onChange, placeholder, rows = 2, enableAI = false, fieldType = 'general' }) => {
  const [showAI, setShowAI] = useState(false);

  // Auto-resize handler
  const handleInput = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = Math.max(e.target.scrollHeight, rows * 20) + 'px';
  };
  
  return (
    <div className="group/input relative">
      {label && <label className="text-xs text-neutral-400 mb-1 block">{label}</label>}
      <div className="relative">
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          onInput={handleInput}
          placeholder={placeholder}
          rows={rows}
          className="w-full text-xs text-neutral-700 border border-neutral-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-neutral-300 resize-y min-h-[40px] pr-8"
        />
        {enableAI && (
          <button 
            onClick={() => setShowAI(true)}
            className="absolute right-1 top-1 p-0.5 text-neutral-300 hover:text-purple-600 opacity-0 group-hover/input:opacity-100 transition-all hover:bg-purple-50 rounded"
            title="Edit with AI"
          >
            <Wand2 className="w-3 h-3" />
          </button>
        )}
      </div>
      {showAI && (
        <AIEditModal
          isOpen={showAI}
          onClose={() => setShowAI(false)}
          onConfirm={(newValue) => onChange(newValue)}
          initialValue={value}
          fieldType={fieldType}
        />
      )}
    </div>
  );
};

// Minimalistic skill category row with reordering
const SkillCategoryRow = ({ category, skills, onUpdateName, onUpdateSkills, onRemoveCategory, onMoveUp, onMoveDown, isFirst, isLast }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(skills.join(', '));

  const handleSave = () => {
    const newSkills = editValue.split(',').map(s => s.trim()).filter(Boolean);
    onUpdateSkills(newSkills);
    setIsEditing(false);
  };

  return (
    <div className="group flex items-start gap-2 py-2 border-b border-neutral-100 last:border-0">
      {/* Reorder buttons */}
      <div className="flex flex-col gap-0.5 pt-0.5">
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          className="p-0.5 text-neutral-300 hover:text-neutral-500 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronUp className="w-3 h-3" />
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          className="p-0.5 text-neutral-300 hover:text-neutral-500 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>
      
      {/* Category name */}
      <input
        type="text"
        value={category}
        onChange={(e) => onUpdateName(e.target.value)}
        placeholder="Category"
        className="w-24 text-xs font-medium text-neutral-600 bg-transparent border-0 border-b border-transparent focus:border-neutral-300 focus:outline-none py-1"
      />
      
      {/* Skills - click to edit */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="Skill1, Skill2, Skill3..."
            autoFocus
            className="w-full text-xs text-neutral-700 bg-white border border-neutral-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-neutral-400"
          />
        ) : (
          <div
            onClick={() => { setEditValue(skills.join(', ')); setIsEditing(true); }}
            className="text-xs text-neutral-600 py-1 cursor-text hover:bg-neutral-50 rounded px-1 -mx-1 truncate"
          >
            {skills.length > 0 ? skills.join(' • ') : <span className="text-neutral-400 italic">Click to add skills...</span>}
          </div>
        )}
      </div>
      
      {/* Delete button */}
      <button
        onClick={onRemoveCategory}
        className="p-1 text-neutral-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};


const ResumeEditor = ({ resumeData, onUpdate, onFormatChange }) => {
  const data = resumeData || {};
  const personal = data.personalInfo || {};
  const skills = data.skills || {};
  const sectionFormats = data.sectionFormats || {};

  // State for expanded items
  const [expandedItems, setExpandedItems] = useState({});

  const toggleExpanded = (section, index) => {
    const key = `${section}-${index}`;
    setExpandedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isExpanded = (section, index) => expandedItems[`${section}-${index}`] || false;

  // Get current format for a section
  const getFormat = (sectionId) => {
    if (sectionId === 'summary') return 'points';
    return sectionFormats[sectionId] || SECTION_FORMATS[sectionId]?.default || 'default';
  };

  // Handle format change
  const handleFormatChange = (sectionId, formatId) => {
    if (onFormatChange) {
      onFormatChange(sectionId, formatId);
    }
  };

  // Helper to update nested fields
  const updateField = (path, value) => {
    if (onUpdate) {
      onUpdate(path, value);
    }
  };

  // Helper to add item to array
  const addItem = (arrayPath, newItem) => {
    const currentArray = arrayPath.split('.').reduce((obj, key) => obj?.[key], data) || [];
    updateField(arrayPath, [...currentArray, newItem]);
  };

  // Helper to remove item from array
  const removeItem = (arrayPath, index) => {
    const currentArray = arrayPath.split('.').reduce((obj, key) => obj?.[key], data) || [];
    updateField(arrayPath, currentArray.filter((_, i) => i !== index));
  };

  // Helper to move item in array
  const moveItem = (arrayPath, fromIndex, toIndex) => {
    const currentArray = arrayPath.split('.').reduce((obj, key) => obj?.[key], data) || [];
    if (toIndex < 0 || toIndex >= currentArray.length) return;
    const newArray = [...currentArray];
    [newArray[fromIndex], newArray[toIndex]] = [newArray[toIndex], newArray[fromIndex]];
    updateField(arrayPath, newArray);
  };

  // Helper to update item in array
  const updateArrayItem = (arrayPath, index, field, value) => {
    updateField(`${arrayPath}.${index}.${field}`, value);
  };

  return (
    <div className="h-full overflow-y-auto bg-white text-sm">
      {/* Personal Info - Compact Grid */}
      <Section title="Personal Information">
        <div className="space-y-1.5">
          <CompactInput label="Name" value={personal.name} onChange={(v) => updateField('personalInfo.name', v)} placeholder="John Doe" />
          <CompactInput label="Title" value={personal.title} onChange={(v) => updateField('personalInfo.title', v)} placeholder="Senior Software Engineer" />
          <CompactInput label="Email" value={personal.email} onChange={(v) => updateField('personalInfo.email', v)} placeholder="john@example.com" />
          <CompactInput label="Phone" value={personal.phone} onChange={(v) => updateField('personalInfo.phone', v)} placeholder="+1 234 567 8900" />
          <CompactInput label="Location" value={personal.location} onChange={(v) => updateField('personalInfo.location', v)} placeholder="City, Country" />
          <CompactInput label="LinkedIn" value={personal.linkedin} onChange={(v) => updateField('personalInfo.linkedin', v)} placeholder="linkedin.com/in/..." />
          <CompactInput label="GitHub" value={personal.github} onChange={(v) => updateField('personalInfo.github', v)} placeholder="github.com/..." />
        </div>
      </Section>

      {/* Professional Summary - always bullet points */}
      <Section title="Professional Summary">
        <div className="space-y-2">
          <CompactTextarea
            label=""
            value={data.summary}
            onChange={(v) => updateField('summary', v)}
            placeholder="Enter each point on a new line:\nLed team of 5 engineers\nIncreased efficiency by 40%"
            rows={4}
            enableAI={true}
            fieldType="summary"
          />
          <p className="text-xs text-neutral-400 italic">
            Always rendered as bullet points. Use one point per line.
          </p>
        </div>
      </Section>

      {/* Skills - With Format Selector */}
      <Section title="Technical Skills" count={Object.keys(skills).length}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400">Format</span>
            <FormatSelector
              sectionId="skills"
              currentFormat={getFormat('skills')}
              onFormatChange={handleFormatChange}
            />
          </div>
          <div className="border border-neutral-200 rounded-lg bg-white overflow-hidden">
            <div className="px-3 py-2 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
              <span className="text-xs text-neutral-500">Use arrows to reorder categories; edit skills in display order</span>
              <button
                onClick={() => {
                  const currentSkills = data.skills || {};
                  const newKey = `newCategory`;
                  let counter = 1;
                  while (currentSkills[newKey + (counter > 1 ? counter : '')]) counter++;
                  updateField('skills', { ...currentSkills, [newKey + (counter > 1 ? counter : '')]: [] });
                }}
                className="text-xs text-neutral-500 hover:text-neutral-700 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
            <div className="px-3 py-1">
              {Object.keys(skills).length === 0 ? (
                <div className="py-4 text-center text-xs text-neutral-400">
                  No skill categories yet. Click "Add" to create one.
                </div>
              ) : (
                Object.entries(skills).map(([categoryKey, skillList], index, arr) => (
                  <SkillCategoryRow
                    key={categoryKey}
                    category={categoryKey.startsWith('category_') || categoryKey.startsWith('newCategory') ? '' : categoryKey}
                    skills={Array.isArray(skillList) ? skillList : []}
                    isFirst={index === 0}
                    isLast={index === arr.length - 1}
                    onUpdateName={(newName) => {
                      if (!newName.trim()) return;
                      const entries = Object.entries(data.skills || {});
                      const newSkills = {};
                      entries.forEach(([key, val]) => {
                        newSkills[key === categoryKey ? newName : key] = val;
                      });
                      updateField('skills', newSkills);
                    }}
                    onUpdateSkills={(newSkillList) => {
                      updateField(`skills.${categoryKey}`, newSkillList);
                    }}
                    onRemoveCategory={() => {
                      const currentSkills = { ...data.skills };
                      delete currentSkills[categoryKey];
                      updateField('skills', currentSkills);
                    }}
                    onMoveUp={() => {
                    const entries = Object.entries(data.skills || {});
                    if (index === 0) return;
                    [entries[index - 1], entries[index]] = [entries[index], entries[index - 1]];
                    updateField('skills', Object.fromEntries(entries));
                  }}
                  onMoveDown={() => {
                    const entries = Object.entries(data.skills || {});
                    if (index === arr.length - 1) return;
                    [entries[index], entries[index + 1]] = [entries[index + 1], entries[index]];
                    updateField('skills', Object.fromEntries(entries));
                  }}
                />
              ))
            )}
          </div>
          </div>
        </div>
      </Section>

      {/* Experience - With Format Selector */}
      <Section title="Experience" count={data.experience?.length || 0}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 italic">Edit via "Edit Shared"</span>
            <FormatSelector
              sectionId="experience"
              currentFormat={getFormat('experience')}
              onFormatChange={handleFormatChange}
            />
          </div>
          <div className="border border-neutral-200 rounded-lg bg-white overflow-hidden">
            {data.experience?.length > 0 ? (
              data.experience.map((exp, idx, arr) => (
                <ExpandableRow
                  key={idx}
                  title={exp.position || 'Position'}
                  subtitle={exp.company}
                  isExpanded={isExpanded('exp', idx)}
                  onToggle={() => toggleExpanded('exp', idx)}
                  onRemove={() => removeItem('experience', idx)}
                  onMoveUp={() => moveItem('experience', idx, idx - 1)}
                  onMoveDown={() => moveItem('experience', idx, idx + 1)}
                  isFirst={idx === 0}
                  isLast={idx === arr.length - 1}
              >
                <div className="space-y-1.5">
                  <CompactInput label="Position" value={exp.position} onChange={(v) => updateArrayItem('experience', idx, 'position', v)} placeholder="Software Engineer" enableAI={true} fieldType="experience_position" />
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-neutral-400 w-20">Company</span>
                    <CompactInput value={exp.company} onChange={(v) => updateArrayItem('experience', idx, 'company', v)} placeholder="Company" className="flex-1 !border-b !rounded-none !px-0 !py-0" enableAI={true} fieldType="experience_company" />
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-neutral-400 w-20">Duration</span>
                    <span className="text-neutral-500">{exp.startDate} – {exp.endDate || 'Present'}</span>
                  </div>
                  <CompactTextarea
                    label="Highlights (one per line)"
                    value={exp.highlights?.join('\n')}
                    onChange={(v) => updateArrayItem('experience', idx, 'highlights', v.split('\n').filter(Boolean))}
                    placeholder="• Led team of 5 engineers"
                    rows={3}
                    enableAI={true}
                    fieldType="experience_highlight"
                  />
                </div>
              </ExpandableRow>
            ))
          ) : (
            <div className="py-3 text-center text-xs text-neutral-400">No experience entries</div>
          )}
          </div>
        </div>
      </Section>

      {/* Education - With Format Selector */}
      <Section title="Education" count={data.education?.length || 0}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400">Format</span>
            <FormatSelector
              sectionId="education"
              currentFormat={getFormat('education')}
              onFormatChange={handleFormatChange}
            />
          </div>
          <div className="border border-neutral-200 rounded-lg bg-white overflow-hidden">
            <div className="px-3 py-1.5 bg-neutral-50 border-b border-neutral-200 flex justify-end">
              <button
                onClick={() => addItem('education', { degree: '', field: '', institution: '', graduationDate: '', gpa: '' })}
                className="text-xs text-neutral-500 hover:text-neutral-700 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
          {data.education?.length > 0 ? (
            data.education.map((edu, idx, arr) => (
              <ExpandableRow
                key={idx}
                title={edu.degree || 'Degree'}
                subtitle={edu.institution}
                isExpanded={isExpanded('edu', idx)}
                onToggle={() => toggleExpanded('edu', idx)}
                onRemove={() => removeItem('education', idx)}
                onMoveUp={() => moveItem('education', idx, idx - 1)}
                onMoveDown={() => moveItem('education', idx, idx + 1)}
                isFirst={idx === 0}
                isLast={idx === arr.length - 1}
              >
                <div className="space-y-1.5">
                  <CompactInput label="Degree" value={edu.degree} onChange={(v) => updateArrayItem('education', idx, 'degree', v)} placeholder="Bachelor of Science" />
                  <CompactInput label="Field" value={edu.field} onChange={(v) => updateArrayItem('education', idx, 'field', v)} placeholder="Computer Science" />
                  <CompactInput label="Institution" value={edu.institution} onChange={(v) => updateArrayItem('education', idx, 'institution', v)} placeholder="University" />
                  <CompactInput label="Graduation" value={edu.graduationDate} onChange={(v) => updateArrayItem('education', idx, 'graduationDate', v)} placeholder="2024" />
                  <CompactInput label="GPA" value={edu.gpa} onChange={(v) => updateArrayItem('education', idx, 'gpa', v)} placeholder="3.8" />
                </div>
              </ExpandableRow>
            ))
          ) : (
            <div className="py-3 text-center text-xs text-neutral-400">No education entries</div>
          )}
          </div>
        </div>
      </Section>

      {/* Projects - With Format Selector */}
      <Section title="Projects" count={data.projects?.length || 0}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400">Format</span>
            <FormatSelector
              sectionId="projects"
              currentFormat={getFormat('projects')}
              onFormatChange={handleFormatChange}
            />
          </div>
          <div className="border border-neutral-200 rounded-lg bg-white overflow-hidden">
            <div className="px-3 py-1.5 bg-neutral-50 border-b border-neutral-200 flex justify-end">
              <button
                onClick={() => addItem('projects', { name: '', description: '', technologies: [], highlights: [] })}
                className="text-xs text-neutral-500 hover:text-neutral-700 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
          {data.projects?.length > 0 ? (
            data.projects.map((proj, idx, arr) => (
              <ExpandableRow
                key={idx}
                title={proj.name || 'Project'}
                subtitle={proj.technologies?.slice(0, 3).join(', ')}
                isExpanded={isExpanded('proj', idx)}
                onToggle={() => toggleExpanded('proj', idx)}
                onRemove={() => removeItem('projects', idx)}
                onMoveUp={() => moveItem('projects', idx, idx - 1)}
                onMoveDown={() => moveItem('projects', idx, idx + 1)}
                isFirst={idx === 0}
                isLast={idx === arr.length - 1}
              >
                <div className="space-y-1.5">
                  <CompactInput label="Name" value={proj.name} onChange={(v) => updateArrayItem('projects', idx, 'name', v)} placeholder="Project Name" enableAI={true} fieldType="general" />
                  <CompactTextarea label="Description" value={proj.description} onChange={(v) => updateArrayItem('projects', idx, 'description', v)} placeholder="Brief description..." rows={2} enableAI={true} fieldType="project_description" />
                  <CompactInput label="Tech" value={proj.technologies?.join(', ')} onChange={(v) => updateArrayItem('projects', idx, 'technologies', v.split(',').map(s => s.trim()).filter(Boolean))} placeholder="React, Node.js" enableAI={true} fieldType="skill" />
                  <CompactTextarea label="Highlights" value={proj.highlights?.join('\n')} onChange={(v) => updateArrayItem('projects', idx, 'highlights', v.split('\n').filter(Boolean))} placeholder="• Key feature..." rows={2} enableAI={true} fieldType="project_description" />
                </div>
              </ExpandableRow>
            ))
          ) : (
            <div className="py-3 text-center text-xs text-neutral-400">No projects</div>
          )}
          </div>
        </div>
      </Section>

      {/* Certifications - With Format Selector */}
      <Section title="Certifications" count={data.certifications?.length || 0}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400">Format</span>
            <FormatSelector
              sectionId="certifications"
              currentFormat={getFormat('certifications')}
              onFormatChange={handleFormatChange}
            />
          </div>
          <div className="border border-neutral-200 rounded-lg bg-white overflow-hidden">
            <div className="px-3 py-1.5 bg-neutral-50 border-b border-neutral-200 flex justify-end">
              <button
                onClick={() => addItem('certifications', { name: '', issuer: '', date: '' })}
                className="text-xs text-neutral-500 hover:text-neutral-700 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
          {data.certifications?.length > 0 ? (
            data.certifications.map((cert, idx, arr) => (
              <MinimalRow
                key={idx}
                onRemove={() => removeItem('certifications', idx)}
                onMoveUp={() => moveItem('certifications', idx, idx - 1)}
                onMoveDown={() => moveItem('certifications', idx, idx + 1)}
                isFirst={idx === 0}
                isLast={idx === arr.length - 1}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <input type="text" value={cert.name || ''} onChange={(e) => updateArrayItem('certifications', idx, 'name', e.target.value)} placeholder="Certification" className="flex-1 min-w-[120px] text-xs font-medium text-neutral-700 bg-transparent border-b border-transparent hover:border-neutral-200 focus:border-neutral-400 focus:outline-none py-0.5" />
                  <input type="text" value={cert.issuer || ''} onChange={(e) => updateArrayItem('certifications', idx, 'issuer', e.target.value)} placeholder="Issuer" className="w-28 text-xs text-neutral-500 bg-transparent border-b border-transparent hover:border-neutral-200 focus:border-neutral-400 focus:outline-none py-0.5" />
                  <input type="text" value={cert.date || ''} onChange={(e) => updateArrayItem('certifications', idx, 'date', e.target.value)} placeholder="Date" className="w-16 text-xs text-neutral-400 bg-transparent border-b border-transparent hover:border-neutral-200 focus:border-neutral-400 focus:outline-none py-0.5" />
                </div>
              </MinimalRow>
            ))
          ) : (
            <div className="py-3 text-center text-xs text-neutral-400">No certifications</div>
          )}
          </div>
        </div>
      </Section>

      {/* Internships - With Format Selector */}
      <Section title="Internships" count={data.internships?.length || 0}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400">Format</span>
            <FormatSelector
              sectionId="internships"
              currentFormat={getFormat('internships')}
              onFormatChange={handleFormatChange}
            />
          </div>
          <div className="border border-neutral-200 rounded-lg bg-white overflow-hidden">
            <div className="px-3 py-1.5 bg-neutral-50 border-b border-neutral-200 flex justify-end">
              <button
                onClick={() => addItem('internships', { position: '', company: '', duration: '', highlights: [] })}
                className="text-xs text-neutral-500 hover:text-neutral-700 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
          {data.internships?.length > 0 ? (
            data.internships.map((intern, idx, arr) => (
              <ExpandableRow
                key={idx}
                title={intern.position || 'Position'}
                subtitle={intern.company}
                isExpanded={isExpanded('intern', idx)}
                onToggle={() => toggleExpanded('intern', idx)}
                onRemove={() => removeItem('internships', idx)}
                onMoveUp={() => moveItem('internships', idx, idx - 1)}
                onMoveDown={() => moveItem('internships', idx, idx + 1)}
                isFirst={idx === 0}
                isLast={idx === arr.length - 1}
              >
                <div className="space-y-1.5">
                  <CompactInput label="Position" value={intern.position} onChange={(v) => updateArrayItem('internships', idx, 'position', v)} placeholder="Software Intern" />
                  <CompactInput label="Company" value={intern.company} onChange={(v) => updateArrayItem('internships', idx, 'company', v)} placeholder="Company" />
                  <CompactInput label="Duration" value={intern.duration} onChange={(v) => updateArrayItem('internships', idx, 'duration', v)} placeholder="Jun – Aug 2023" />
                  <CompactTextarea label="Highlights" value={intern.highlights?.join('\n')} onChange={(v) => updateArrayItem('internships', idx, 'highlights', v.split('\n').filter(Boolean))} placeholder="• Key achievement..." rows={2} />
                </div>
              </ExpandableRow>
            ))
          ) : (
            <div className="py-3 text-center text-xs text-neutral-400">No internships</div>
          )}
          </div>
        </div>
      </Section>

      {/* Hackathons - With Format Selector */}
      <Section title="Hackathons & Awards" count={data.hackathons?.length || 0}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400">Format</span>
            <FormatSelector
              sectionId="hackathons"
              currentFormat={getFormat('hackathons')}
              onFormatChange={handleFormatChange}
            />
          </div>
          <div className="border border-neutral-200 rounded-lg bg-white overflow-hidden">
            <div className="px-3 py-1.5 bg-neutral-50 border-b border-neutral-200 flex justify-end">
              <button
                onClick={() => addItem('hackathons', { name: '', description: '', date: '' })}
                className="text-xs text-neutral-500 hover:text-neutral-700 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            {data.hackathons?.length > 0 ? (
              data.hackathons.map((hack, idx, arr) => (
                <MinimalRow
                  key={idx}
                  onRemove={() => removeItem('hackathons', idx)}
                  onMoveUp={() => moveItem('hackathons', idx, idx - 1)}
                  onMoveDown={() => moveItem('hackathons', idx, idx + 1)}
                  isFirst={idx === 0}
                  isLast={idx === arr.length - 1}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <input type="text" value={hack.name || ''} onChange={(e) => updateArrayItem('hackathons', idx, 'name', e.target.value)} placeholder="Name" className="flex-1 min-w-[120px] text-xs font-medium text-neutral-700 bg-transparent border-b border-transparent hover:border-neutral-200 focus:border-neutral-400 focus:outline-none py-0.5" />
                    <input type="text" value={hack.description || ''} onChange={(e) => updateArrayItem('hackathons', idx, 'description', e.target.value)} placeholder="Achievement" className="w-32 text-xs text-neutral-500 bg-transparent border-b border-transparent hover:border-neutral-200 focus:border-neutral-400 focus:outline-none py-0.5" />
                    <input type="text" value={hack.date || ''} onChange={(e) => updateArrayItem('hackathons', idx, 'date', e.target.value)} placeholder="Date" className="w-16 text-xs text-neutral-400 bg-transparent border-b border-transparent hover:border-neutral-200 focus:border-neutral-400 focus:outline-none py-0.5" />
                  </div>
                </MinimalRow>
              ))
            ) : (
              <div className="py-3 text-center text-xs text-neutral-400">No hackathons/awards</div>
            )}
          </div>
        </div>
      </Section>
    </div>
  );
};

export default ResumeEditor;
