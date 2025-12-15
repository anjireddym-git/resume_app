import React from 'react';
import { getAllTemplates } from '../templates';
import { Check } from 'lucide-react';

const TemplateSelector = ({ selectedTemplate, onSelectTemplate }) => {
  const templates = getAllTemplates();

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-4">
      <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3 block">
        Template
      </label>
      <div className="space-y-2">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelectTemplate(template.id)}
            className={`w-full p-3 rounded-lg border text-left transition-all ${
              selectedTemplate === template.id
                ? 'border-neutral-900 bg-neutral-50'
                : 'border-neutral-200 hover:border-neutral-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-900">
                {template.name}
              </span>
              {selectedTemplate === template.id && (
                <Check className="w-4 h-4 text-neutral-900" />
              )}
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">{template.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TemplateSelector;
