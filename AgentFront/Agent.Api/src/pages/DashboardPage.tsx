import { useState, useEffect } from "react";

// Helper to get the auth token from sessionStorage
function getAuthToken(): string | null {
  try {
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

interface Post {
  id: string;
  message: string;
  created_time: string;
}

function DashboardPage() {
  const [fanCount, setFanCount] = useState<number>(0);
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [totalPosts, setTotalPosts] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const apiUrl = resolveApiUrl();
      const token = getAuthToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Get fan count
      const fanCountRes = await fetch(`${apiUrl}/api/facebook/stats`, {
        method: "GET",
        headers,
      });

      if (fanCountRes.ok) {
        const data = await fanCountRes.json();
        if (data.fan_count !== undefined) {
          setFanCount(data.fan_count);
        }
      }

      // Get recent posts
      const postsRes = await fetch(`${apiUrl}/api/facebook/posts`, {
        method: "GET",
        headers,
      });

      if (postsRes.ok) {
        const data = await postsRes.json();
        if (data.data && Array.isArray(data.data)) {
          setRecentPosts(data.data.slice(0, 5));
          setTotalPosts(data.data.length);
        }
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      setError("Failed to load Facebook metrics");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    } catch {
      return dateString;
    }
  };

  const truncateMessage = (message: string, maxLength: number = 100) => {
    if (!message) return "No message";
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + "...";
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Facebook Dashboard</h1>
        <p className="text-gray-600 mt-2">Monitor your Facebook page metrics and activity</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">Page Followers</p>
              <p className="text-4xl font-bold">{fanCount.toLocaleString()}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-md p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium mb-1">Total Posts</p>
              <p className="text-4xl font-bold">{totalPosts}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z" clipRule="evenodd" />
                <path d="M15 7h1a2 2 0 012 2v5.5a1.5 1.5 0 01-3 0V7z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-md p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium mb-1">Engagement</p>
              <p className="text-4xl font-bold">Active</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-1 gap-6">
        {/* Recent Posts */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Recent Posts</h2>
            <button
              onClick={loadDashboardData}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              Refresh
            </button>
          </div>
          {recentPosts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No posts found</p>
          ) : (
            <div className="space-y-4">
              {recentPosts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-start space-x-3 pb-4 border-b border-gray-100 last:border-0"
                >
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{truncateMessage(post.message)}</p>
                    <p className="text-sm text-gray-600 mt-1">{formatDate(post.created_time)}</p>
                    <p className="text-xs text-gray-400 mt-1">Post ID: {post.id}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;