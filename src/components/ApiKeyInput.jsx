import React, { useState } from 'react';
import { Key } from 'lucide-react';

const ApiKeyInput = ({ onApiKeySet, isSet }) => {
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (apiKey.trim()) {
      onApiKeySet(apiKey.trim());
      setShowApiKey(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
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
