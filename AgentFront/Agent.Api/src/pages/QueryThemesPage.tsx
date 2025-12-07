import { useEffect, useState } from "react";
import { loadQueryThemes, saveQueryThemes, saveQueryThemeSelection } from "../query/apiClient";
import MultiSelectGrid from "../components/MultiSelectGrid";

type Theme = {
  id: string;
  text: string;
  selected: boolean;
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export default function QueryThemesPage() {
  const [items, setItems] = useState<Theme[]>([]);
  const [input, setInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const loaded = await loadQueryThemes();
        if (!mounted) return;
        // Try to restore selection state from localStorage
        const selectionKey = "query_themes_selection";
        const savedSelection = localStorage.getItem(selectionKey);
        const selectedTexts = savedSelection ? JSON.parse(savedSelection) : [];
        
        setItems(loaded.map((t) => ({ 
          id: uid(), 
          text: t,
          selected: selectedTexts.includes(t)
        })));
      } catch (e) {
        console.error("Failed to load themes:", e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    // Persist to API (or fallback to localStorage) whenever items change
    (async () => {
      try {
        await saveQueryThemes(items.map((i) => i.text));
        // Also save selection state to both localStorage and backend
        const selectionKey = "query_themes_selection";
        const selectedTexts = items.filter(i => i.selected).map(i => i.text);
        localStorage.setItem(selectionKey, JSON.stringify(selectedTexts));
        await saveQueryThemeSelection(selectedTexts);
      } catch (e) {
        console.error("Failed to save themes:", e);
      }
    })();
  }, [items]);

  function addOrUpdate() {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (editingId) {
      setItems((s) => s.map((it) => (it.id === editingId ? { ...it, text: trimmed } : it)));
      setEditingId(null);
    } else {
      setItems((s) => [{ id: uid(), text: trimmed, selected: true }, ...s]);
    }
    setInput("");
  }

  function toggleSelection(id: string) {
    setItems((s) => s.map((it) => (it.id === id ? { ...it, selected: !it.selected } : it)));
  }

  function selectAll() {
    setItems((s) => s.map((it) => ({ ...it, selected: true })));
  }

  function deselectAll() {
    setItems((s) => s.map((it) => ({ ...it, selected: false })));
  }

  function clearAll() {
    if (!confirm("Clear all query themes?")) return;
    setItems([]);
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Google Query Themes</h1>
        <div className="text-sm text-gray-500">Manage query themes for Google searches</div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex space-x-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addOrUpdate()}
            placeholder="Add a theme (e.g. 'privacy', 'ai policy')"
            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <button
            onClick={addOrUpdate}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            {editingId ? "Update" : "Add"}
          </button>
          <button
            onClick={() => { setInput(""); setEditingId(null); }}
            className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
        </div>

        <div className="mt-4">
          <MultiSelectGrid
            items={items.map((t) => ({ id: t.id, label: t.text, selected: t.selected }))}
            onToggle={(id) => toggleSelection(id as string)}
            onSelectAll={selectAll}
            onDeselectAll={deselectAll}
            onClear={clearAll}
            title="Saved Themes"
            emptyMessage={<p className="text-gray-500">No themes yet. Add some above.</p>}
            showLabel={true}
          />
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">How Query Themes Work</p>
            <ul className="list-disc ml-4 space-y-1">
              <li><strong>Only selected themes</strong> are appended to web searches performed by the AI assistant</li>
              <li>Click the checkbox to select/deselect themes for use in searches</li>
              <li>This helps focus searches on topics relevant to your needs (e.g., privacy, security, AI policy)</li>
              <li>Themes are stored in the database and synced across all your sessions</li>
              <li>Changes take effect immediately for all new searches in the Chat page</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
