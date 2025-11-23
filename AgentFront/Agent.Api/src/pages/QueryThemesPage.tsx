import { useEffect, useState } from "react";
import { loadQueryThemes, saveQueryThemes } from "../query/apiClient";

type Theme = {
  id: string;
  text: string;
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
        setItems(loaded.map((t) => ({ id: uid(), text: t })));
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
      setItems((s) => [{ id: uid(), text: trimmed }, ...s]);
    }
    setInput("");
  }

  function editItem(id: string) {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    setEditingId(id);
    setInput(it.text);
  }

  function removeItem(id: string) {
    setItems((s) => s.filter((x) => x.id !== id));
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
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-medium">Saved Themes ({items.length})</h2>
            <div>
              <button onClick={clearAll} className="text-sm text-red-600 hover:underline">Clear all</button>
            </div>
          </div>

          {items.length === 0 ? (
            <p className="text-gray-500">No themes yet. Add some above.</p>
          ) : (
            <ul className="space-y-2">
              {items.map((it) => (
                <li key={it.id} className="flex items-center justify-between border p-2 rounded-md">
                  <div className="text-sm text-gray-800">{it.text}</div>
                  <div className="space-x-2">
                    <button onClick={() => editItem(it.id)} className="text-sm text-indigo-600 hover:underline">Edit</button>
                    <button onClick={() => removeItem(it.id)} className="text-sm text-red-600 hover:underline">Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-6 text-sm text-gray-500">
        <p>Notes:</p>
        <ul className="list-disc ml-5">
          <li>The themes are stored in your browser's localStorage.</li>
          <li>Integrate with the backend using `apiClient` when ready (TODO).</li>
        </ul>
      </div>
    </div>
  );
}
