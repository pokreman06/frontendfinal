import { useState, useEffect } from 'react';

interface ToolSetting {
  id: number;
  toolName: string;
  isEnabled: boolean;
  description: string;
}

function resolveApiBase() {
  const raw = import.meta.env.VITE_API_URL as string | undefined;
  const envUrl = raw?.replace(/\/$/, "");
  if (envUrl) {
    if (/^https?:\/\//i.test(envUrl)) return envUrl;
    if (
      envUrl.startsWith("localhost") ||
      envUrl.startsWith("127.") ||
      envUrl.startsWith("0.") ||
      /:\d+$/.test(envUrl)
    ) {
      return `http://${envUrl}`;
    }
    return `https://${envUrl}`;
  }

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:8000";
    }
  }

  return "https://api.nagent.duckdns.org";
}

const API_BASE_URL = resolveApiBase();

const ToolSettingsPage: React.FC = () => {
  const [tools, setTools] = useState<ToolSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTools, setSelectedTools] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadToolSettings();
  }, []);

  const loadToolSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/tool-settings`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ToolSetting[] = await response.json();
      setTools(data);
      setSelectedTools(new Set(data.filter(t => t.isEnabled).map(t => t.id)));
    } catch (err) {
      console.error('Error loading tool settings:', err);
      setError('Failed to load tool settings');
    } finally {
      setLoading(false);
    }
  };

  const toggleTool = (toolId: number) => {
    const newSelectedTools = new Set(selectedTools);
    if (selectedTools.has(toolId)) {
      newSelectedTools.delete(toolId);
    } else {
      newSelectedTools.add(toolId);
    }
    setSelectedTools(newSelectedTools);
  };

  const saveChanges = async () => {
    try {
      setLoading(true);
      setError(null);

      // Update each tool
      const updates = tools.map(tool => ({
        toolName: tool.toolName,
        isEnabled: selectedTools.has(tool.id)
      }));

      const response = await fetch(`${API_BASE_URL}/api/tool-settings/bulk`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ tools: updates })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Refresh the list
      await loadToolSettings();
      alert('Tool settings saved successfully!');
    } catch (err) {
      console.error('Error saving tool settings:', err);
      setError('Failed to save tool settings');
    } finally {
      setLoading(false);
    }
  };

  const enableAll = () => {
    setSelectedTools(new Set(tools.map(t => t.id)));
  };

  const disableAll = () => {
    setSelectedTools(new Set());
  };

  if (loading && tools.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 p-6 flex items-center justify-center">
        <div className="text-xl">Loading tool settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Tool Settings</h1>
          <p className="text-gray-400">
            Enable or disable specific agentic tools to control what the AI agent can do
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {/* Controls */}
        <div className="mb-6 flex gap-3">
          <button
            onClick={enableAll}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            Enable All
          </button>
          <button
            onClick={disableAll}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            Disable All
          </button>
          <button
            onClick={saveChanges}
            disabled={loading}
            className="ml-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 gap-4">
          {tools.length === 0 ? (
            <div className="p-8 text-center bg-gray-800 rounded-lg border border-gray-700">
              <p className="text-gray-400">No tool settings found. Tools will be initialized on next agent run.</p>
            </div>
          ) : (
            tools.map(tool => (
              <div
                key={tool.id}
                className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                  selectedTools.has(tool.id)
                    ? 'bg-blue-500/20 border-blue-500'
                    : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                }`}
                onClick={() => toggleTool(tool.id)}
              >
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={selectedTools.has(tool.id)}
                    onChange={() => {}}
                    className="w-5 h-5 mt-1 rounded border-gray-500 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{tool.toolName}</h3>
                      <span
                        className={`px-2 py-1 text-xs rounded-full font-medium ${
                          selectedTools.has(tool.id)
                            ? 'bg-green-500/30 text-green-200'
                            : 'bg-gray-700 text-gray-300'
                        }`}
                      >
                        {selectedTools.has(tool.id) ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    {tool.description && (
                      <p className="text-gray-400 text-sm mt-1">{tool.description}</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary */}
        {tools.length > 0 && (
          <div className="mt-8 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <p className="text-gray-300">
              <span className="font-semibold">{selectedTools.size}</span> of{' '}
              <span className="font-semibold">{tools.length}</span> tools enabled
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolSettingsPage;
