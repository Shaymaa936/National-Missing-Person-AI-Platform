// Centralized API client base URL and helpers
export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export function getAuthToken() {
  return localStorage.getItem("token");
}

export function authHeaders(extraHeaders = {}) {
  const token = getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  };
}

export function getFullImageUrl(url, token) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : "";
  return `${API_BASE}${url}${tokenParam}`;
}
