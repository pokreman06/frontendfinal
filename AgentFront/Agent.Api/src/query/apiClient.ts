import toast from "react-hot-toast";

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:4444";

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