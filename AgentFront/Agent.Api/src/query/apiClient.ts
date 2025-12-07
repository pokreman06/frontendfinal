import toast from "react-hot-toast";

// Determine API base URL with precedence:
// 1. `import.meta.env.VITE_API_URL` (build-time env)
// 2. If running in the browser on localhost -> use local backend `http://localhost:4444`
// 3. Otherwise default to the public API host `https://api.nagent.duckdns.org`
function resolveApiBase() {
  const raw = import.meta.env.VITE_API_URL as string | undefined;
  const envUrl = raw?.replace(/\/$/, "");
  if (envUrl) {
    // If env already includes a scheme, use it as-is
    if (/^https?:\/\//i.test(envUrl)) return envUrl;

    // If the env value looks like a localhost/host:port or an IP, prefer http
    if (
      envUrl.startsWith("localhost") ||
      envUrl.startsWith("127.") ||
      envUrl.startsWith("0.") ||
      /:\d+$/.test(envUrl)
    ) {
      return `http://${envUrl}`;
    }

    // Otherwise assume https
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

export type ApiClientOptions = RequestInit & { baseUrl?: string; suppressToast?: boolean };

// Helper to get the auth token from sessionStorage (set by the auth context)
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

export async function apiClient<T>(
  input: string,
  options: ApiClientOptions = {}
): Promise<T> {
    const baseUrl = options.baseUrl ?? `${API_BASE_URL}/api`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  // Add Authorization header if we have a token
  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${baseUrl}${input}`, {
      ...options,
      headers,
      credentials: "include", // Include cookies if needed
    });

    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      try {
        const data = await res.json();
        message = data.error || data.message || message;
      } catch {}
      if (!options.suppressToast) {
        toast.error(message);
      }
      throw new Error(message);
    }

    const contentType = res.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      return (await res.json()) as T;
    }
    return null as unknown as T;
  } catch (err) {
    if (!options.suppressToast) {
      console.error("API fetch failed:", err);
      toast.error("Network error");
    }
    throw err;
  }
}

// Theme helpers: try the backend first, fall back to localStorage
const THEME_STORAGE_KEY = "google_query_themes";

export async function loadQueryThemes(): Promise<string[]> {
  try {
    // Expect backend to return { themes: string[] }
    const data = await apiClient<{ themes: string[] }>("/query-themes", { suppressToast: true });
    return data?.themes ?? [];
  } catch (err) {
    console.warn("loadQueryThemes: falling back to localStorage", err);
    try {
      const raw = localStorage.getItem(THEME_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("loadQueryThemes: localStorage parse failed", e);
      return [];
    }
  }
}

export async function saveQueryThemes(themes: string[]): Promise<void> {
  try {
    await apiClient<void>("/query-themes", {
      method: "POST",
      body: JSON.stringify({ themes }),
    });
  } catch (err) {
    console.warn("saveQueryThemes: API save failed, using localStorage", err);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(themes));
    } catch (e) {
      console.error("saveQueryThemes: localStorage save failed", e);
    }
  }
}

export async function saveQueryThemeSelection(selectedTexts: string[]): Promise<void> {
  try {
    await apiClient<void>("/query-themes/selection", {
      method: "POST",
      body: JSON.stringify({ selectedTexts }),
    });
  } catch (err) {
    console.warn("saveQueryThemeSelection: API save failed", err);
  }
}

// Source Materials interface and helpers
export interface SourceMaterial {
  id?: number;
  email?: string;
  url: string;
  title: string;
  contentType: "pdf" | "html";
  description?: string;
  createdAt?: string;
}

const SOURCES_STORAGE_KEY = "source_materials";

export async function loadSourceMaterials(email: string): Promise<SourceMaterial[]> {
  try {
    const data = await apiClient<SourceMaterial[]>(
      `/sourcematerials/user/${encodeURIComponent(email)}`,
      { suppressToast: true }
    );
    console.log("loadSourceMaterials API response:", data);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn("loadSourceMaterials: falling back to localStorage", err);
    try {
      const raw = localStorage.getItem(SOURCES_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("loadSourceMaterials: localStorage parse failed", e);
      return [];
    }
  }
}

export async function saveSourceMaterial(material: SourceMaterial): Promise<SourceMaterial> {
  try {
    const data = await apiClient<SourceMaterial>("/sourcematerials", {
      method: "POST",
      body: JSON.stringify(material),
    });
    return data || material;
  } catch (err) {
    console.warn("saveSourceMaterial: API save failed", err);
    throw err;
  }
}

export async function updateSourceMaterial(id: number, material: SourceMaterial): Promise<SourceMaterial> {
  try {
    const data = await apiClient<SourceMaterial>(`/sourcematerials/${id}`, {
      method: "PUT",
      body: JSON.stringify(material),
    });
    return data || material;
  } catch (err) {
    console.warn("updateSourceMaterial: API update failed", err);
    throw err;
  }
}

export async function deleteSourceMaterial(id: number): Promise<void> {
  try {
    await apiClient<void>(`/sourcematerials/${id}`, {
      method: "DELETE",
    });
  } catch (err) {
    console.warn("deleteSourceMaterial: API delete failed", err);
    throw err;
  }
}

export interface ToolCall {
  id: number;
  toolName: string;
  query: string;
  arguments?: any;
  result?: any;
  executedAt: string;
  durationMs?: number;
}

export interface ToolCallsResponse {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  toolCalls: ToolCall[];
}

export async function loadToolCalls(page: number = 1, pageSize: number = 50, toolName?: string): Promise<ToolCallsResponse> {
  try {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("pageSize", pageSize.toString());
    if (toolName) {
      params.append("toolName", toolName);
    }
    
    const data = await apiClient<ToolCallsResponse>(`/tool-calls?${params}`, { suppressToast: true });
    return data ?? { total: 0, page: 1, pageSize: 50, totalPages: 0, toolCalls: [] };
  } catch (err) {
    console.error("loadToolCalls: failed", err);
    return { total: 0, page: 1, pageSize: 50, totalPages: 0, toolCalls: [] };
  }
}

export async function loadToolCallStats(): Promise<any[]> {
  try {
    const data = await apiClient<{ stats: any[] }>("/tool-calls/stats", { suppressToast: true });
    return data?.stats ?? [];
  } catch (err) {
    console.error("loadToolCallStats: failed", err);
    return [];
  }
}