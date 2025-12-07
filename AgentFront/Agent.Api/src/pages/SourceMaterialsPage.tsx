import { useEffect, useState } from "react";
import { loadSourceMaterials, saveSourceMaterial, updateSourceMaterial, deleteSourceMaterial } from "../query/apiClient";
import type { SourceMaterial } from "../query/apiClient";
import { useAuth } from "react-oidc-context";
import toast from "react-hot-toast";

type LocalSourceMaterial = Omit<SourceMaterial, 'id'> & {
  id: string; // Local ID for editing before save
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export default function SourceMaterialsPage() {
  const auth = useAuth();
  const [materials, setMaterials] = useState<LocalSourceMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<LocalSourceMaterial>>({
    url: "",
    title: "",
    contentType: "html",
    description: "",
  });

  // Load materials on component mount and when auth changes
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const userEmail = auth.user?.profile?.email;
        console.log("SourceMaterialsPage: Loading materials for email:", userEmail);
        
        if (!userEmail) {
          console.warn("SourceMaterialsPage: No user email available");
          setLoading(false);
          return;
        }
        
        const loaded = await loadSourceMaterials(userEmail);
        console.log("SourceMaterialsPage: Loaded materials:", loaded);
        
        if (!mounted) return;
        setMaterials(
          loaded.map((m) => ({
            ...m,
            id: m.id?.toString() || uid(),
          }))
        );
      } catch (e) {
        console.error("SourceMaterialsPage: Failed to load source materials:", e);
        toast.error("Failed to load source materials");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [auth.user]);

  async function handleAddOrUpdate() {
    const url = formData.url?.trim();
    const title = formData.title?.trim();
    
    if (!url || !title) {
      toast.error("Please fill in URL and title");
      return;
    }

    try {
      const email = auth.user?.profile?.email;
      if (!email) {
        toast.error("User email not available");
        return;
      }

      const payload: SourceMaterial = {
        url,
        title,
        contentType: formData.contentType || "html",
        description: formData.description?.trim(),
        email,
      };

      if (editingId) {
        // Update existing
        const existing = materials.find((m) => m.id === editingId);
        if (existing?.id && !isNaN(Number(existing.id))) {
          const response = await updateSourceMaterial(Number(existing.id), payload);
          setMaterials((s) =>
            s.map((m) =>
              m.id === editingId
                ? { ...response, id: existing.id }
                : m
            )
          );
          toast.success("Source material updated");
        }
      } else {
        // Create new
        const response = await saveSourceMaterial(payload);
        setMaterials((s) => [
          {
            ...response,
            id: response.id?.toString() || uid(),
          },
          ...s,
        ]);
        toast.success("Source material added");
      }

      resetForm();
    } catch (e) {
      console.error("Failed to save:", e);
      toast.error("Failed to save source material");
    }
  }

  async function handleDelete(id: string) {
    const material = materials.find((m) => m.id === id);
    if (!material?.id || isNaN(Number(material.id))) {
      toast.error("Cannot delete unsaved material");
      return;
    }

    if (!confirm(`Delete "${material.title}"?`)) return;

    try {
      await deleteSourceMaterial(Number(material.id));
      setMaterials((s) => s.filter((m) => m.id !== id));
      toast.success("Source material deleted");
    } catch (e) {
      console.error("Failed to delete:", e);
      toast.error("Failed to delete source material");
    }
  }

  function handleEdit(material: LocalSourceMaterial) {
    setFormData({
      url: material.url,
      title: material.title,
      contentType: material.contentType,
      description: material.description,
    });
    setEditingId(material.id);
  }

  function resetForm() {
    setFormData({
      url: "",
      title: "",
      contentType: "html",
      description: "",
    });
    setEditingId(null);
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Source Materials</h1>
        <div className="text-sm text-gray-500">Manage PDF and HTML articles</div>
      </div>

      {/* Add/Edit Form */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <h2 className="text-lg font-semibold mb-4">
          {editingId ? "Edit Material" : "Add New Material"}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData.title || ""}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleAddOrUpdate()}
              placeholder="e.g., 'How to Implement OAuth 2.0'"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL *
            </label>
            <input
              type="url"
              value={formData.url || ""}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleAddOrUpdate()}
              placeholder="https://example.com/article.pdf"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content Type
              </label>
              <select
                value={formData.contentType || "html"}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    contentType: e.target.value as "pdf" | "html",
                  })
                }
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="html">HTML Article</option>
                <option value="pdf">PDF Document</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add notes about this material..."
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          <div className="flex space-x-2">
            <button
              onClick={handleAddOrUpdate}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
            >
              {editingId ? "Update" : "Add"}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Materials List */}
      <div className="bg-white rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold p-4 border-b">
          Saved Materials ({materials.length})
        </h2>

        {materials.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No source materials yet. Add some above to get started.
          </div>
        ) : (
          <div className="divide-y">
            {materials.map((material) => (
              <div key={material.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {material.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2 break-words">
                      <a
                        href={material.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-700 underline"
                      >
                        {material.url}
                      </a>
                    </p>
                    {material.description && (
                      <p className="text-sm text-gray-600 mb-2">
                        {material.description}
                      </p>
                    )}
                    <div className="flex items-center space-x-3 text-xs text-gray-500">
                      <span className="px-2 py-1 bg-gray-100 rounded">
                        {material.contentType === "pdf" ? "📄 PDF" : "🌐 HTML"}
                      </span>
                      {material.createdAt && (
                        <span>Added {new Date(material.createdAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleEdit(material)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(material.id)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <svg
            className="w-5 h-5 text-blue-600 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">How to Use Source Materials</p>
            <ul className="list-disc ml-4 space-y-1">
              <li>
                Save links to PDF articles or HTML pages you want to analyze
              </li>
              <li>
                When posting to Facebook, you can select a source material to
                have the AI fetch and analyze its content
              </li>
              <li>
                The AI will automatically create an ACTION message to fetch and
                process the material
              </li>
              <li>
                Materials are stored per user and accessible across all your
                sessions
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
