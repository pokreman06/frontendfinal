import { useState, useEffect } from 'react';
import { useImagePreferences } from '../contexts/useImagePreferences';
import { apiClient } from '../query/apiClient';
import toast from 'react-hot-toast';

// Helper to get the auth token from sessionStorage
function getAuthToken(): string | null {
  try {
    // Try different client IDs that might be in use
    const clientIds = ['nagent', 'nathan_react'];
    for (const clientId of clientIds) {
      const authData = sessionStorage.getItem(`oidc.user:https://auth-dev.snowse.io/realms/DevRealm:${clientId}`);
      if (authData) {
        const user = JSON.parse(authData);
        if (user.access_token) {
          return user.access_token;
        }
      }
    }
  } catch (e) {
    console.debug("Failed to retrieve auth token from sessionStorage", e);
  }
  return null;
}

// Helper to resolve API base URL
function resolveApiUrl(): string {
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

interface SavedImage {
  url: string;
  id: number;
  fileName: string;
  originalName: string;
  size: number;
  uploadedAt: string;
}

interface PixabayImage {
  id: number;
  webformatURL: string;
  previewURL: string;
  userImageURL?: string;
  user?: string;
  tags: string;
  views: number;
  downloads: number;
  favorites: number;
  likes: number;
  comments: number;
}

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
      setManuallyEdited(false);
    }
  };

  const handleAddMood = () => {
    if (newMood.trim()) {
      addMood(newMood);
      setNewMood("");
      setManuallyEdited(false);
    }
  };

  const activeThemes = getActiveThemes();
  const activeMoods = getActiveMoods();
  const [searchQuery, setSearchQuery] = useState("");
  const [manuallyEdited, setManuallyEdited] = useState(false);
  const [images, setImages] = useState<PixabayImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('selected_images');
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });
  
  // Saved images management
  const [savedImages, setSavedImages] = useState<SavedImage[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  const loadSavedImages = async () => {
    try {
      const data = await apiClient<{ images: SavedImage[] }>('/images/saved', { suppressToast: true });
      setSavedImages(data.images || []);
    } catch (error) {
      console.error('Failed to load saved images:', error);
      setSavedImages([]);
    }
  };

  useEffect(() => {
    loadSavedImages();
  }, []);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('file', file);

      const apiUrl = resolveApiUrl();
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(
        `${apiUrl}/api/images/upload`,
        {
          method: 'POST',
          headers,
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed:', errorText);
        throw new Error(`Upload failed: ${response.status}`);
      }

      toast.success('Image uploaded successfully!');
      await loadSavedImages();
    } catch (error) {
      toast.error('Failed to upload image');
      console.error(error);
    } finally {
      setUploadingImage(false);
      event.target.value = '';
    }
  };

  const handleDeleteImage = async (id: number) => {
    if (!confirm('Delete this image?')) return;
    
    try {
      await apiClient(`/images/saved/${id}`, { method: 'DELETE' });
      toast.success('Image deleted');
      await loadSavedImages();
    } catch (error) {
      toast.error('Failed to delete image');
      console.error(error);
    }
  };

  useEffect(() => {
    // Update search query whenever active themes or moods change, but only if user hasn't manually edited it
    if (!manuallyEdited) {
      const t = activeThemes[0]?.name;
      const m = activeMoods[0]?.name;
      setSearchQuery([m, t].filter(Boolean).join(' '));
    }
  }, [activeThemes, activeMoods, manuallyEdited]);

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
                    onClick={() => {
                      toggleTheme(theme.id);
                      setManuallyEdited(false);
                    }}
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
                    onClick={() => {
                      toggleMood(mood.id);
                      setManuallyEdited(false);
                    }}
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

      {/* Saved Images Management */}
      <div className="mt-8 bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Your Saved Images</h2>
          <label className="cursor-pointer bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 transition-all flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span>{uploadingImage ? 'Uploading...' : 'Upload Image'}</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploadingImage}
              className="hidden"
            />
          </label>
        </div>

        {savedImages.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p>No images uploaded yet. Upload your first image to use in posts!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {savedImages.map((img) => (
              <div key={img.fileName} className="relative group">
                <img
                  src={img.url}
                  alt={img.fileName}
                  className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 group-hover:border-indigo-400 transition-all"
                />
                <button
                  onClick={() => handleDeleteImage(img.id)}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  title="Delete image"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <div className="mt-2 text-xs text-gray-500 truncate" title={img.originalName}>
                  {img.originalName}
                </div>
                <div className="text-xs text-gray-400">
                  {(img.size / 1024).toFixed(0)} KB
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Search */}
      <div className="mt-8 bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Search Images (Pixabay)</h2>
          <div className="text-sm text-gray-500">For reference/inspiration</div>
        </div>

        <div className="flex space-x-2 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setManuallyEdited(true);
            }}
            placeholder="Search images (e.g. 'vibrant cyberpunk')"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none"
          />
          <button
            onClick={async () => {
              if (!searchQuery.trim()) return;
              try {
                setLoadingImages(true);
                const qs = new URLSearchParams({ q: searchQuery, per_page: '24' }).toString();
                const data = await apiClient<{ hits: PixabayImage[] }>(`/images/search?${qs}`);
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
            onClick={async () => {
              const selectedIds = Object.keys(selected).filter(k => selected[k]);
              if (selectedIds.length === 0) {
                toast.error('No images selected');
                return;
              }
              
              try {
                setUploadingImage(true);
                const apiUrl = resolveApiUrl();
                const token = getAuthToken();
                
                let successCount = 0;
                let failCount = 0;
                
                for (const imgId of selectedIds) {
                  const img = images.find(i => i.id.toString() === imgId);
                  if (!img) continue;
                  
                  try {
                    // Download image from Pixabay
                    const imageResponse = await fetch(img.webformatURL);
                    const blob = await imageResponse.blob();
                    
                    // Upload to backend
                    const formData = new FormData();
                    formData.append('file', blob, `pixabay_${img.id}.jpg`);
                    
                    const headers: Record<string, string> = {};
                    if (token) {
                      headers['Authorization'] = `Bearer ${token}`;
                    }
                    
                    const uploadResponse = await fetch(`${apiUrl}/api/images/upload`, {
                      method: 'POST',
                      headers,
                      body: formData,
                    });
                    
                    if (uploadResponse.ok) {
                      successCount++;
                    } else {
                      failCount++;
                    }
                  } catch (err) {
                    console.error(`Failed to upload image ${imgId}:`, err);
                    failCount++;
                  }
                }
                
                if (successCount > 0) {
                  toast.success(`Uploaded ${successCount} image(s) successfully`);
                  await loadSavedImages();
                  setSelected({});
                }
                if (failCount > 0) {
                  toast.error(`Failed to upload ${failCount} image(s)`);
                }
              } catch (error) {
                toast.error('Failed to upload images');
                console.error(error);
              } finally {
                setUploadingImage(false);
              }
            }}
            disabled={uploadingImage || Object.keys(selected).filter(k => selected[k]).length === 0}
            className={`px-4 py-2 rounded-lg ${
              uploadingImage || Object.keys(selected).filter(k => selected[k]).length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {uploadingImage ? 'Uploading...' : 'Upload Selected'}
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