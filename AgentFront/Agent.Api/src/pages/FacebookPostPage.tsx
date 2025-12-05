import { useState, useEffect } from "react";
import { loadQueryThemes } from "../query/apiClient";
import { usePost } from "../context/PostContext";
import ToolUsageDisplay from "../components/ToolUsageDisplay";

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
  dockerUrl: string;
  id: number;
  fileName: string;
  originalName: string;
  size: number;
  uploadedAt: string;
}

interface ToolCall {
  name: string;
  arguments?: any;
  result?: any;
}

export default function FacebookPostPage() {
  const [inputText, setInputText] = useState("");
  const [recommendation, setRecommendation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [queryThemes, setQueryThemes] = useState<string[]>([]);
  const [savedImages, setSavedImages] = useState<SavedImage[]>([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>("");
  const [selectedImageDockerUrl, setSelectedImageDockerUrl] = useState<string>("");
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const { postData, setPostData } = usePost();

  useEffect(() => {
    loadQueryThemes().then(setQueryThemes).catch(console.error);
    loadSavedImages();
  }, []);

  // Load data from context if available
  useEffect(() => {
    if (postData) {
      setInputText(postData.message);
      if (postData.imageUrl) {
        setSelectedImageUrl(postData.imageUrl);
      }
      if (postData.imageDockerUrl) {
        setSelectedImageDockerUrl(postData.imageDockerUrl);
      }
      if (postData.toolCalls) {
        setToolCalls(postData.toolCalls);
      }
      // Clear the context data after loading
      setPostData(null);
    }
  }, [postData, setPostData]);

  const loadSavedImages = async () => {
    try {
      const apiUrl = resolveApiUrl();
      const token = getAuthToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`${apiUrl}/api/images/saved`, {
        method: "GET",
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        setSavedImages(data.images || []);
      } else {
        console.warn(`Failed to load saved images: ${res.status}`);
        setSavedImages([]);
      }
    } catch (err) {
      console.error("Failed to load saved images:", err);
      setSavedImages([]);
    }
  };

  const handleGetRecommendation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setRecommendation(null);
    setError(null);

    const payload = {
      userMessage: `Based on this text: "${inputText}", recommend a good Facebook post message. Just provide the recommended message text, nothing else.`,
      model: "gpt-oss-120b",
      conversationHistory: [],
      queryThemes: queryThemes,
    };

    try {
        const apiUrl = resolveApiUrl();
        const token = getAuthToken();
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        const res = await fetch(`${apiUrl}/api/agent/chat`, {
          method: "POST",
          headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setRecommendation(data);
      
      // Map functionExecutions to toolCalls format
      if (data.functionExecutions && data.functionExecutions.length > 0) {
        const mappedToolCalls = data.functionExecutions.map((exec: any) => ({
          name: exec.functionName,
          arguments: exec.parameters,
          result: exec.result
        }));
        setToolCalls(mappedToolCalls);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get recommendation");
    } finally {
      setLoading(false);
    }
  };

  const handlePostToFacebook = async (messageToPost: string) => {
    // Show confirmation dialog
    const confirmMessage = selectedImageDockerUrl
      ? `Are you sure you want to post this message with an image to Facebook?\n\n"${messageToPost}"`
      : `Are you sure you want to post this message to Facebook?\n\n"${messageToPost}"`;
    
    if (!window.confirm(confirmMessage)) {
      return; // User cancelled
    }

    setPosting(true);
    setError(null);

    const userMessage = selectedImageDockerUrl
      ? `ACTION: post_image_to_facebook
PARAMETERS:
image_url=${selectedImageDockerUrl}
caption=${messageToPost}
EXPLANATION: Posting an image with caption to Facebook.`
      : `Post this message to our Facebook page: "${messageToPost}"`;

    const payload = {
      userMessage,
      model: "gpt-oss-120b",
      conversationHistory: [],
      queryThemes: queryThemes,
    };

    try {
        const apiUrl = resolveApiUrl();
        const token = getAuthToken();
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        const res = await fetch(`${apiUrl}/api/agent/chat`, {
          method: "POST",
          headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setRecommendation({ ...recommendation, posted: true, postResult: data });
      
      // Map functionExecutions to toolCalls format and append
      if (data.functionExecutions && data.functionExecutions.length > 0) {
        const mappedToolCalls = data.functionExecutions.map((exec: any) => ({
          name: exec.functionName,
          arguments: exec.parameters,
          result: exec.result
        }));
        setToolCalls([...toolCalls, ...mappedToolCalls]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post to Facebook");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white shadow-xl rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
          <h2 className="text-2xl font-bold text-white">
            Facebook Post Assistant
          </h2>
          <p className="text-blue-100 mt-1">
            Get AI-powered recommendations for your Facebook posts
          </p>
        </div>

        {/* Form */}
        <div className="p-6">
          <form onSubmit={handleGetRecommendation} className="space-y-4">
            <div>
              <label
                htmlFor="inputText"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Describe what you want to post about
              </label>
              <textarea
                id="inputText"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                required
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="E.g., 'We're launching a new product next week' or 'Share our latest blog post about AI trends'..."
              />
            </div>

            {/* Image Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select an Image (Optional)
              </label>
              
              {savedImages.length === 0 ? (
                <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  No saved images. Upload images in the{" "}
                  <a href="/imagepreference" className="text-blue-600 hover:underline">
                    Image Preferences
                  </a>{" "}
                  page first.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  <button
                    type="button"
                    onClick={() => { setSelectedImageUrl(""); setSelectedImageDockerUrl(""); }}
                    className={`relative h-20 rounded-lg border-2 flex items-center justify-center transition-all ${
                      !selectedImageUrl
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 bg-gray-50 hover:border-gray-300"
                    }`}
                  >
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {!selectedImageUrl && (
                      <div className="absolute -top-2 -right-2 bg-blue-500 rounded-full p-1">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                  
                  {savedImages.map((img) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => { setSelectedImageUrl(img.url); setSelectedImageDockerUrl(img.dockerUrl); }}
                      className={`relative h-20 rounded-lg border-2 overflow-hidden transition-all ${
                        selectedImageUrl === img.url
                          ? "border-blue-500 ring-2 ring-blue-200"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <img
                        src={img.url}
                        alt={img.originalName}
                        className="w-full h-full object-cover"
                      />
                      {selectedImageUrl === img.url && (
                        <div className="absolute -top-2 -right-2 bg-blue-500 rounded-full p-1">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
              
              {selectedImageUrl && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center space-x-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-blue-800">Image selected. Your post will include this image.</span>
                </div>
              )}
            </div>
            <ToolUsageDisplay />
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all ${
                loading || !inputText.trim()
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 active:scale-95"
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Getting recommendation...
                </span>
              ) : (
                "Get Post Recommendation"
              )}
            </button>
          </form>

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <svg
                  className="h-5 w-5 text-red-400 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Recommendation Display */}
          {recommendation && !recommendation.posted && (
            <div className="mt-6 space-y-4">
              <ToolUsageDisplay toolCalls={toolCalls} />
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <svg
                        className="h-5 w-5 text-blue-400 mr-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <h3 className="text-sm font-medium text-blue-800">
                        Recommended Post
                      </h3>
                    </div>
                    <p className="text-gray-900 whitespace-pre-wrap">
                      {recommendation.response}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => handlePostToFacebook(recommendation.response)}
                  disabled={posting}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold text-white transition-all ${
                    posting
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700 active:scale-95"
                  }`}
                >
                  {posting ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Posting...
                    </span>
                  ) : (
                    "✓ Post to Facebook"
                  )}
                </button>
                <button
                  onClick={() => setRecommendation(null)}
                  className="px-6 py-3 rounded-lg font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}


          {/* Post Success Display */}
          {recommendation?.posted && (
            <div className="mt-6 space-y-4">
              <ToolUsageDisplay toolCalls={toolCalls} />
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start">
                  <svg
                    className="h-5 w-5 text-green-400 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-green-800">
                      Successfully Posted!
                    </h3>
                    <p className="mt-1 text-sm text-green-700">
                      {recommendation.postResult?.response}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setRecommendation(null);
                  setInputText("");
                }}
                className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all"
              >
                Create Another Post
              </button>

              {/* Full Response Details */}
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                  View Full Response
                </summary>
                <pre className="mt-2 p-4 bg-gray-50 border border-gray-200 rounded-lg text-xs overflow-x-auto">
                  {JSON.stringify(recommendation.postResult, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          How it works
        </h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start">
            <span className="mr-2">1.</span>
            <span>Enter the message you want to post to your Facebook page</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">2.</span>
            <span>
              The AI agent will use the Facebook MCP service to post the message
            </span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">3.</span>
            <span>You'll see the result and confirmation below</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
