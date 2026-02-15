import { useState } from 'react';
import { X, Server, Cpu, Save } from 'lucide-react';
import { cn } from '../lib/utils';

export default function SettingsPanel({ settings, onUpdate, isOpen, onClose }) {
  const [localSettings, setLocalSettings] = useState(settings);

  const handleSave = () => {
    onUpdate(localSettings);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-96 z-50 glass border-l border-border animate-fade-in">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold">Settings</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Model */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Cpu size={14} className="text-primary" />
                Model
              </label>
              <select
                value={localSettings.model}
                onChange={(e) =>
                  setLocalSettings((s) => ({ ...s, model: e.target.value }))
                }
                className={cn(
                  'w-full rounded-xl px-3 py-2.5 text-sm',
                  'bg-input border border-border',
                  'focus:outline-none focus:ring-2 focus:ring-ring/50',
                  'transition-all duration-200'
                )}
              >
                <option value="o3-mini">o3-mini</option>
                <option value="gpt-4o">gpt-4o</option>
                <option value="gpt-4o-mini">gpt-4o-mini</option>
                <option value="gpt-4.1">gpt-4.1</option>
                <option value="gpt-4.1-mini">gpt-4.1-mini</option>
                <option value="gpt-4.1-nano">gpt-4.1-nano</option>
              </select>
            </div>

            {/* MCP Server */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Server size={14} className="text-primary" />
                MCP Server URL
              </label>
              <input
                type="url"
                value={localSettings.mcpServerUrl}
                onChange={(e) =>
                  setLocalSettings((s) => ({ ...s, mcpServerUrl: e.target.value }))
                }
                placeholder="https://cool.cloudpilot.com.br/mcp"
                className={cn(
                  'w-full rounded-xl px-3 py-2.5 text-sm font-mono',
                  'bg-input border border-border',
                  'focus:outline-none focus:ring-2 focus:ring-ring/50',
                  'placeholder:text-muted-foreground',
                  'transition-all duration-200'
                )}
              />
              <p className="text-[11px] text-muted-foreground">
                The MCP server providing tools for the AI model.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <button
              onClick={handleSave}
              className={cn(
                'w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5',
                'bg-primary text-primary-foreground font-medium text-sm',
                'hover:bg-primary/90 active:scale-[0.98]',
                'transition-all duration-200'
              )}
            >
              <Save size={16} />
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
