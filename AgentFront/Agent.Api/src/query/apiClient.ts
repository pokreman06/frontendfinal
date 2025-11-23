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

export type ApiClientOptions = RequestInit & { baseUrl?: string };

export async function apiClient<T>(
  input: string,
  options: ApiClientOptions = {}
): Promise<T> {
    const baseUrl = options.baseUrl ?? `${API_BASE_URL}/api`;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(`${baseUrl}${input}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      try {
        const data = await res.json();
        message = data.error || data.message || message;
      } catch {}
      toast.error(message);
      throw new Error(message);
    }

    const contentType = res.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      return (await res.json()) as T;
    }
    return null as unknown as T;
  } catch (err) {
    console.error("API fetch failed:", err);
    toast.error("Network error");
    throw err;
  }
}

// Theme helpers: try the backend first, fall back to localStorage
const THEME_STORAGE_KEY = "google_query_themes";

export async function loadQueryThemes(): Promise<string[]> {
  try {
    // Expect backend to return { themes: string[] }
    const data = await apiClient<{ themes: string[] }>("/query-themes");
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