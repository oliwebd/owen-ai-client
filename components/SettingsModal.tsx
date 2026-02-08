import React, { useState, useEffect } from 'react';
import { OllamaConfig, Agent } from '../types';
import { RefreshIcon, BotIcon } from './Icons';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: OllamaConfig;
  onSave: (config: OllamaConfig) => void;
  availableModels: string[];
  agents: Agent[];
  onRefreshModels: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  config, 
  onSave, 
  availableModels, 
  agents,
  onRefreshModels 
}) => {
  const [tempConfig, setTempConfig] = useState(config);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('custom');

  // Sync tempConfig with config when modal opens
  useEffect(() => {
    if (isOpen) {
      setTempConfig(config);
      // Try to find if current prompt matches an agent
      const matchingAgent = agents.find(a => a.systemPrompt === config.systemPrompt);
      if (matchingAgent) {
        setSelectedAgentId(matchingAgent.id);
      } else {
        setSelectedAgentId('custom');
      }
    }
  }, [isOpen, config, agents]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefreshModels();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const agentId = e.target.value;
    setSelectedAgentId(agentId);
    
    if (agentId !== 'custom') {
      const agent = agents.find(a => a.id === agentId);
      if (agent) {
        setTempConfig(prev => ({ ...prev, systemPrompt: agent.systemPrompt }));
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl w-full max-w-md p-6 shadow-2xl transform transition-all max-h-[90vh] overflow-y-auto custom-scrollbar">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Settings</h2>
        
        <div className="space-y-5">
          {/* Models */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Model Name</label>
            <div className="flex gap-2">
              {availableModels.length > 0 ? (
                <div className="relative w-full">
                  <select
                    value={tempConfig.model}
                    onChange={(e) => setTempConfig({ ...tempConfig, model: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-lg px-4 py-2 text-gray-900 dark:text-white appearance-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all cursor-pointer"
                  >
                    {availableModels.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500 dark:text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              ) : (
                <input
                  type="text"
                  value={tempConfig.model}
                  onChange={(e) => setTempConfig({ ...tempConfig, model: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  placeholder="qwen2.5-coder:1.5b"
                />
              )}
              
              <button
                onClick={handleRefresh}
                className={`p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg transition-all ${isRefreshing ? 'animate-spin' : ''}`}
                title="Refresh Models"
              >
                <RefreshIcon className="w-5 h-5" />
              </button>
            </div>
            {availableModels.length === 0 && (
               <p className="text-xs text-orange-500 dark:text-orange-400 mt-1">Could not fetch models. Enter manually.</p>
            )}
          </div>

          {/* Agents */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
              <div className="flex items-center gap-2">
                <BotIcon className="w-4 h-4" />
                <span>Agent Preset</span>
              </div>
            </label>
            <div className="relative w-full">
              <select
                value={selectedAgentId}
                onChange={handleAgentChange}
                className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-lg px-4 py-2 text-gray-900 dark:text-white appearance-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all cursor-pointer"
              >
                <option value="custom">Custom Configuration</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500 dark:text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Select a preset to auto-fill the system prompt.</p>
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">System Prompt</label>
            <textarea
              value={tempConfig.systemPrompt || ''}
              onChange={(e) => {
                setTempConfig({ ...tempConfig, systemPrompt: e.target.value });
                setSelectedAgentId('custom');
              }}
              className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all min-h-[120px] resize-y text-sm font-mono leading-relaxed"
              placeholder="You are a helpful coding assistant..."
            />
          </div>

          {/* Base URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Ollama Host URL</label>
            <input
              type="text"
              value={tempConfig.baseUrl}
              onChange={(e) => setTempConfig({ ...tempConfig, baseUrl: e.target.value })}
              className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
              placeholder="http://localhost:11434"
            />
          </div>

        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(tempConfig);
              onClose();
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};