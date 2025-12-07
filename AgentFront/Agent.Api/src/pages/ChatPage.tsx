import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePost } from "../context/usePost";
import ToolUsageDisplay from "../components/ToolUsageDisplay";

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

interface ToolCall {
  name: string;
  arguments?: Record<string, unknown>;
  result?: Record<string, unknown> | string;
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
  toolCalls?: ToolCall[];
  userQuery?: string; // The original user query that generated these tool calls
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { setPostData } = usePost();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const ready_to_post = (message: string, toolCalls?: ToolCall[], imageUrl?: string, imageDockerUrl?: string) => {
    setPostData({
      message,
      imageUrl,
      imageDockerUrl,
      toolCalls,
    });
    navigate("/facebook-post");
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;

    const userMessage: Message = {
      role: "user",
      content: inputText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setLoading(true);
    setError(null);

    // Build conversation history in the format the API expects
    // Filter to prevent consecutive assistant messages
    const conversationHistory: Array<{role: string; content: string}> = [];
    let lastRole: string | null = null;
    
    for (const msg of messages) {
      // Skip consecutive assistant messages (keep only the last one before a user message)
      if (msg.role === "assistant" && lastRole === "assistant") {
        conversationHistory.pop(); // Remove previous assistant message
      }
      conversationHistory.push({
        role: msg.role,
        content: msg.content,
      });
      lastRole = msg.role;
    }

    const payload = {
      userMessage: inputText,
      model: "gpt-oss-120b",
      conversationHistory: conversationHistory,
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
      console.log("API Response:", data);
      
      // Map functionExecutions to toolCalls format
      const toolCalls = (data.functionExecutions || []).map((exec: Record<string, unknown>) => ({
        name: exec.functionName,
        arguments: exec.parameters,
        result: exec.result
      }));
      
      console.log("Mapped Tool Calls:", toolCalls);
      
      const assistantMessage: Message = {
        role: "assistant",
        content: data.response || data.message || "No response received",
        timestamp: new Date(),
        toolCalls: toolCalls,
        userQuery: inputText, // Store the original user query
      };

      console.log("Assistant Message:", assistantMessage);
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      console.error("Chat error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setError(null);
  };

  const suggestedPrompts = [
    "Search for recent AI research papers in PDF format",
    "Find information about climate change",
    "What are the latest news about machine learning?",
    "Search for python tutorials and summarize the first result",
    "Post a message to Facebook",
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">AI Assistant</h1>
            <p className="text-blue-100 text-sm mt-1">
              Search the web, read pages, post to Facebook, and more
            </p>
          </div>
          <button
            onClick={handleClearChat}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Clear Chat
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <svg
                    className="w-8 h-8 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Start a Conversation
                </h2>
                <p className="text-gray-600 mb-6">
                  Ask me anything! I can search the web, read webpages, and manage your Facebook page.
                </p>
              </div>

              {/* Suggested Prompts */}
              <div className="text-left max-w-2xl mx-auto">
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  Try asking:
                </p>
                <div className="grid gap-2">
                  {suggestedPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInputText(prompt)}
                      className="text-left px-4 py-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm text-gray-700"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] ${
                    msg.role === "user"
                      ? ""
                      : ""
                  }`}
                >
                  <div
                    className={`rounded-lg px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-white border border-gray-200 text-gray-800"
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">
                      {msg.content}
                    </div>
                    {msg.timestamp && (
                      <div
                        className={`text-xs mt-2 ${
                          msg.role === "user"
                            ? "text-blue-100"
                            : "text-gray-500"
                        }`}
                      >
                        {msg.timestamp.toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                  
                  {msg.role === "assistant" && msg.toolCalls && msg.toolCalls.length > 0 && (
                    <>
                      <ToolUsageDisplay toolCalls={msg.toolCalls} query={msg.userQuery} />
                      <button
                        onClick={() => ready_to_post(msg.content, msg.toolCalls)}
                        className="mt-2 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                          />
                        </svg>
                        <span>Ready to Post</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-800">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="font-semibold">Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 px-4 py-4">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
          <div className="flex space-x-4">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask me anything..."
              disabled={loading}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? "Sending..." : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
