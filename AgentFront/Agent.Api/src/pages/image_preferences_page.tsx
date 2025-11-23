import { useState, useEffect } from 'react';
import { useImagePreferences } from '../contexts/image_preferences_context';
import { apiClient } from '../query/apiClient';

function ImagePreferencesPage() {
  const {
    themes,
    moods,
    addTheme,
    addMood,
    toggleTheme,
    toggleMood,
    removeTheme,
    removeMood,
    getActiveThemes,
    getActiveMoods,
  } = useImagePreferences();

  const [newTheme, setNewTheme] = useState("");
  const [newMood, setNewMood] = useState("");

  const handleAddTheme = () => {
    if (newTheme.trim()) {
      addTheme(newTheme);
      setNewTheme("");
    }
  };

  const handleAddMood = () => {
    if (newMood.trim()) {
      addMood(newMood);
      setNewMood("");
    }
  };

  const activeThemes = getActiveThemes();
  const activeMoods = getActiveMoods();
  const [searchQuery, setSearchQuery] = useState("");
  const [images, setImages] = useState<any[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('selected_images');
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });

  useEffect(() => {
    // default search query built from first active theme and mood
    if (!searchQuery) {
      const t = activeThemes[0]?.name;
      const m = activeMoods[0]?.name;
      if (t || m) setSearchQuery([m, t].filter(Boolean).join(' '));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const previewText = activeThemes.length > 0 && activeMoods.length > 0
    ? `A ${activeMoods[Math.floor(Math.random() * activeMoods.length)]?.name.toLowerCase()} ${activeThemes[Math.floor(Math.random() * activeThemes.length)]?.name.toLowerCase()} style image`
    : "Select themes and moods to see preview";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Image Preferences</h1>
        <p className="text-gray-600 mt-2">
          Manage your favorite themes and moods for image generation
        </p>
      </div>

      {/* Quick Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
          <div className="flex items-center space-x-3 mb-2">
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <h3 className="text-lg font-bold text-gray-900">Active Themes</h3>
          </div>
          <p className="text-3xl font-bold text-indigo-600">{activeThemes.length}</p>
          <p className="text-sm text-gray-600 mt-1">
            {activeThemes.map(t => t.name).join(", ") || "None selected"}
          </p>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
          <div className="flex items-center space-x-3 mb-2">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-bold text-gray-900">Active Moods</h3>
          </div>
          <p className="text-3xl font-bold text-purple-600">{activeMoods.length}</p>
          <p className="text-sm text-gray-600 mt-1">
            {activeMoods.map(m => m.name).join(", ") || "None selected"}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Themes Section */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Themes</h2>
            <span className="text-sm text-gray-500">{themes.length} total</span>
          </div>

          {/* Add New Theme */}
          <div className="mb-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newTheme}
                onChange={(e) => setNewTheme(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTheme()}
                placeholder="Add new theme..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={handleAddTheme}
                className="btn-primary flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Themes List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {themes.map((theme) => (
              <div
                key={theme.id}
                className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                  theme.active
                    ? 'bg-indigo-50 border-indigo-300'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => toggleTheme(theme.id)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      theme.active
                        ? 'bg-indigo-600 border-indigo-600'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    {theme.active && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  <span className={`font-medium ${theme.active ? 'text-gray-900' : 'text-gray-500'}`}>
                    {theme.name}
                  </span>
                </div>
                <button
                  onClick={() => removeTheme(theme.id)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Moods Section */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Moods</h2>
            <span className="text-sm text-gray-500">{moods.length} total</span>
          </div>

          {/* Add New Mood */}
          <div className="mb-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newMood}
                onChange={(e) => setNewMood(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddMood()}
                placeholder="Add new mood..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={handleAddMood}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-2 px-4 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Moods List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {moods.map((mood) => (
              <div
                key={mood.id}
                className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                  mood.active
                    ? 'bg-purple-50 border-purple-300'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => toggleMood(mood.id)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      mood.active
                        ? 'bg-purple-600 border-purple-600'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    {mood.active && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  <span className={`font-medium ${mood.active ? 'text-gray-900' : 'text-gray-500'}`}>
                    {mood.name}
                  </span>
                </div>
                <button
                  onClick={() => removeMood(mood.id)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Query Preview */}
      <div className="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
        <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center space-x-2">
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>Query Preview</span>
        </h3>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Your active preferences would generate queries like:</p>
          <p className="text-gray-900 font-mono text-sm">{previewText}</p>
        </div>
      </div>

      {/* Image Search */}
      <div className="mt-8 bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Search Images</h2>
          <div className="text-sm text-gray-500">Powered by Pixabay</div>
        </div>

        <div className="flex space-x-2 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search images (e.g. 'vibrant cyberpunk')"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none"
          />
          <button
            onClick={async () => {
              if (!searchQuery.trim()) return;
              try {
                setLoadingImages(true);
                const qs = new URLSearchParams({ q: searchQuery, per_page: '24' }).toString();
                const data = await apiClient<any>(`/images/search?${qs}`);
                // Pixabay returns { hits: [...] }
                setImages(data?.hits || []);
              } catch (e) {
                console.error(e);
              } finally {
                setLoadingImages(false);
              }
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
          >
            Search
          </button>
          <button
            onClick={() => {
              const toSave = Object.keys(selected).filter(k => selected[k]);
              localStorage.setItem('selected_images', JSON.stringify(selected));
              alert(`Saved ${toSave.length} selected images to localStorage`);
            }}
            className="px-4 py-2 bg-gray-100 rounded-lg"
          >
            Save Selected
          </button>
        </div>

        {loadingImages ? (
          <div className="text-gray-600">Loading images...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((img) => (
              <div key={img.id} className="relative">
                <img src={img.previewURL} alt={img.tags} className="w-full h-32 object-cover rounded-lg" />
                <button
                  onClick={() => setSelected(s => ({ ...s, [img.id]: !s[img.id] }))}
                  className={`absolute top-2 right-2 p-1 rounded-full border-2 ${selected[img.id] ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-200'}`}
                >
                  {selected[img.id] ? (
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
                  ) : (
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                  )}
                </button>
                <div className="mt-1 text-xs text-gray-600">{img.user}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ImagePreferencesPage;