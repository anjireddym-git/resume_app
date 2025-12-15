import React, { useState } from 'react';
import { Key, ChevronDown, Check } from 'lucide-react';
import { AI_MODELS } from '../services/geminiService';

// Group models by provider
const groupedModels = Object.values(AI_MODELS).reduce((acc, model) => {
  const provider = model.provider || 'other';
  if (!acc[provider]) acc[provider] = [];
  acc[provider].push(model);
  return acc;
}, {});

const providerLabels = {
  gemini: 'Gemini',
  openai: 'OpenAI',
};

const ApiKeyInput = ({ onApiKeySet, onModelChange, isSet, currentModel }) => {
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showModelSelect, setShowModelSelect] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (apiKey.trim()) {
      onApiKeySet(apiKey.trim());
      setShowApiKey(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      {/* Model Selector */}
      <div className="relative">
        <button
          onClick={() => setShowModelSelect(!showModelSelect)}
          className="h-8 px-3 bg-neutral-100 rounded-lg text-sm text-neutral-700 flex items-center gap-1.5 hover:bg-neutral-200 transition-all"
        >
          {AI_MODELS[currentModel]?.name || 'Select Model'}
          <span className="text-xs text-neutral-500 ml-1">
            ({AI_MODELS[currentModel]?.provider === 'openai' ? 'OpenAI' : 'Gemini'})
          </span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showModelSelect ? 'rotate-180' : ''}`} />
        </button>

        {showModelSelect && (
          <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-neutral-200 rounded-lg shadow-lg z-20 py-1 max-h-80 overflow-y-auto">
            {Object.entries(groupedModels).map(([provider, models]) => (
              <div key={provider}>
                <div className="px-3 py-1.5 text-xs font-semibold text-neutral-400 uppercase tracking-wide bg-neutral-50 border-b border-neutral-100">
                  {providerLabels[provider] || provider}
                </div>
                {models.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      onModelChange(model.id);
                      setShowModelSelect(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-neutral-50 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{model.name}</p>
                      <p className="text-xs text-neutral-500">{model.description}</p>
                    </div>
                    {currentModel === model.id && <Check className="w-4 h-4 text-neutral-900" />}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* API Key */}
      <div className="flex items-center gap-2">
        {isSet ? (
          <span className="text-xs text-neutral-500 flex items-center gap-1">
            <Key className="w-3 h-3" />
            API Connected
          </span>
        ) : (
          <button
            onClick={() => setShowApiKey(!showApiKey)}
            className="text-xs text-neutral-500 hover:text-neutral-700"
          >
            Set API Key
          </button>
        )}

        {showApiKey && (
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter API key"
              className="h-8 px-3 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 w-48"
            />
            <button
              type="submit"
              className="h-8 px-3 bg-neutral-900 text-white text-sm rounded-lg hover:bg-neutral-800"
            >
              Save
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ApiKeyInput;
