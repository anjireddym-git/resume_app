import React, { useState, useEffect } from 'react';
import { X, Loader2, Sparkles, CheckSquare, Square, Zap, FileText } from 'lucide-react';
import AgentThinkingPane from './AgentThinkingPane';

const FIELD_OPTIONS = [
  { id: 'headline', label: 'Professional Headline', description: 'Title shown below your name', default: true },
  { id: 'summary', label: 'Professional Summary', description: 'Professional summary bullet points', default: true },
  { id: 'jobTitles', label: 'Job Titles', description: 'Position/role names in experience', default: true },
  { id: 'experience', label: 'Experience Highlights', description: 'Job responsibilities and achievements', default: true },
  { id: 'skills', label: 'Skills', description: 'Technical and soft skills', default: true },
  { id: 'projects', label: 'Projects', description: 'Project descriptions and tech stack', default: true },
  { id: 'internships', label: 'Internships', description: 'Internship experiences', default: true },
  { id: 'hackathons', label: 'Hackathons', description: 'Hackathon participations and achievements', default: true },
  { id: 'certifications', label: 'Certifications', description: 'Professional certifications', default: true },
];

const JobDescriptionModal = ({ 
  isOpen, 
  onClose, 
  onOptimize, 
  onCheckMatch,
  isLoading,
  isAnalyzing,
  initialJobDescription = '',
  agentStream = null,  // { active, thoughts[], answerPreview, usage, status, elapsedMs, validator, model, error }
}) => {
  const [inputText, setInputText] = useState(initialJobDescription);
  const [mode, setMode] = useState('job'); // 'job' or 'transform'
  const [selectedFields, setSelectedFields] = useState(
    FIELD_OPTIONS.reduce((acc, field) => ({ ...acc, [field.id]: field.default }), {})
  );

  // Auto-detect mode based on input length
  useEffect(() => {
    const trimmed = inputText.trim();
    if (trimmed.length > 0 && trimmed.length < 150 && !trimmed.includes('\n')) {
      setMode('transform');
    } else if (trimmed.length >= 150) {
      setMode('job');
    }
  }, [inputText]);

  const toggleField = (fieldId) => {
    setSelectedFields(prev => ({ ...prev, [fieldId]: !prev[fieldId] }));
  };

  const handleOptimize = () => {
    if (!inputText.trim()) return;
    
    const fieldsToUpdate = Object.entries(selectedFields)
      .filter(([_, selected]) => selected)
      .map(([id]) => id);
    
    onOptimize(inputText, fieldsToUpdate, mode);
  };

  const handleCheckMatch = () => {
    if (!inputText.trim()) return;
    onCheckMatch(inputText);
  };

  if (!isOpen) return null;

  const selectedCount = Object.values(selectedFields).filter(Boolean).length;
  const isTransformMode = mode === 'transform';
  const showAgentPane = !!agentStream?.active;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className={`bg-white rounded-2xl w-full ${showAgentPane ? 'max-w-4xl' : 'max-w-lg'} max-h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-xl flex flex-col`}>
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">
              {isTransformMode ? 'Quick Transform' : 'Optimize for Job'}
            </h2>
            <p className="text-sm text-neutral-500">
              {isTransformMode 
                ? 'Transform your resume for a new role' 
                : 'Tailor your resume to match a job description'}
            </p>
          </div>
          <button 
            onClick={onClose} 
            disabled={isLoading}
            className="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-hidden ${showAgentPane ? 'flex flex-col md:flex-row' : ''}`}>
          <div className={`overflow-y-auto p-4 space-y-4 ${showAgentPane ? 'md:w-1/2 border-b md:border-b-0 md:border-r border-neutral-200' : 'flex-1'}`}>
          {/* Mode Toggle */}
          <div className="flex gap-2 p-1 bg-neutral-100 rounded-lg">
            <button
              onClick={() => setMode('job')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                !isTransformMode 
                  ? 'bg-white shadow text-neutral-900' 
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              Job Description
            </button>
            <button
              onClick={() => setMode('transform')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                isTransformMode 
                  ? 'bg-white shadow text-neutral-900' 
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <Zap className="w-4 h-4" />
              Quick Transform
            </button>
          </div>

          {/* Input */}
          <div>
            <label className="text-sm font-medium text-neutral-700 block mb-1.5">
              {isTransformMode ? 'Target Role' : 'Job Description'}
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isTransformMode 
                ? 'e.g., "Change to Machine Learning Engineer with AWS" or "Convert to Data Scientist"'
                : 'Paste the job description here...'}
              className={`w-full p-3 text-sm border border-neutral-200 rounded-lg resize-none focus:outline-none focus:border-neutral-400 placeholder:text-neutral-400 ${
                isTransformMode ? 'h-20' : 'h-32 sm:h-40'
              }`}
              disabled={isLoading}
            />
            {isTransformMode && (
              <p className="text-xs text-neutral-500 mt-1">
                Tip: Be specific about technologies, e.g., "ML Engineer with PyTorch and AWS"
              </p>
            )}
          </div>

          {/* Field Selection */}
          <div>
            <label className="text-sm font-medium text-neutral-700 block mb-2">
              Fields to Update ({selectedCount} selected)
            </label>
            <div className="space-y-2">
              {FIELD_OPTIONS.map((field) => (
                <button
                  key={field.id}
                  onClick={() => toggleField(field.id)}
                  disabled={isLoading}
                  className={`w-full p-3 rounded-lg border text-left transition-all flex items-start gap-3 ${
                    selectedFields[field.id]
                      ? 'border-neutral-900 bg-neutral-50'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  {selectedFields[field.id] ? (
                    <CheckSquare className="w-5 h-5 text-neutral-900 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Square className="w-5 h-5 text-neutral-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{field.label}</p>
                    <p className="text-xs text-neutral-500">{field.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
          {showAgentPane && (
            <div className="md:w-1/2 p-4 min-h-[40vh] md:min-h-0 overflow-hidden">
              <AgentThinkingPane
                thoughts={agentStream.thoughts || []}
                answerPreview={agentStream.answerPreview || ''}
                usage={agentStream.usage}
                status={agentStream.status || 'thinking'}
                elapsedMs={agentStream.elapsedMs || 0}
                validator={agentStream.validator}
                model={agentStream.model || ''}
                error={agentStream.error || ''}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-200 flex flex-col sm:flex-row gap-2">
          {!isTransformMode && (
            <button
              onClick={handleCheckMatch}
              disabled={isLoading || isAnalyzing || !inputText.trim()}
              className="flex-1 h-10 border border-neutral-200 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isAnalyzing && !isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Check Match
            </button>
          )}
          <button
            onClick={handleOptimize}
            disabled={isLoading || !inputText.trim() || selectedCount === 0}
            className={`h-10 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 flex items-center justify-center gap-2 ${
              isTransformMode ? 'flex-1' : 'flex-1'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isTransformMode ? 'Transforming...' : 'Optimizing...'}
              </>
            ) : (
              <>
                {isTransformMode ? <Zap className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                {isTransformMode ? 'Transform Resume' : 'Optimize Resume'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobDescriptionModal;
