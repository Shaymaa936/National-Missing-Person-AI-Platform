// Centralized API client base URL and helpers
// Backend address. Falls back when VITE_API_URL is missing (e.g. a fresh
// copy without frontend/.env):
//   - development: http://localhost:5000
//   - production build: same domain as the site (Nginx sends /api to Node)
export const API_BASE = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:5000" : "")
).replace(/\/+$/, "");
if (!API_BASE && import.meta.env.DEV) {
  console.warn("VITE_API_URL is not set - using http://localhost:5000. Create frontend/.env to change it.");
}

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
