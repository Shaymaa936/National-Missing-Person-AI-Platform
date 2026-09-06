// Talks to the Node backend's /api/audit endpoints for the admin
// "Audit Log" panel (list logs, write a new entry, export as CSV).

const API_BASE = import.meta.env.VITE_API_URL ;
if (!API_BASE && import.meta.env.DEV) {
  console.error("VITE_API_URL is not defined! Check your .env file.");
}

function authHeaders(token) {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchAuditLogs(token) {
  const res = await fetch(`${API_BASE}/api/audit`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to load audit log");
  return res.json();
}

export async function createAuditLogApi(token, { action, detail, kind, actor }) {
  const res = await fetch(`${API_BASE}/api/audit`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ action, detail, kind, actor }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to write audit log");
  return data;
}

export function exportAuditLogsUrl(token) {
  // Direct-download link; the browser tab handles the Bearer token
  // via a query param fallback isn't supported server-side, so we
  // fetch + blob-download instead (see downloadAuditLogsCsv below).
  return `${API_BASE}/api/audit/export`;
}

export async function downloadAuditLogsCsv(token) {
  const res = await fetch(`${API_BASE}/api/audit/export`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to export audit log");
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "trace_audit_logs.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
export async function deleteAuditLogApi(token, id) {
  const res = await fetch(`${API_BASE}/api/audit/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Failed to delete audit log");
  }

  return data;
}

// Maps a Mongo AuditLog document into the flat shape the AdminDashboard
// "audit" section (and the dashboard's Activity panel) already renders.
export function toAuditShape(a) {
  return {
    id: a._id,
    actor: a.actor || "Admin User",
    action: a.action,
    detail: a.detail,
    kind: a.kind || "info",
    ts: a.createdAt
      ? new Date(a.createdAt).toISOString().slice(0, 16).replace("T", " ")
      : "",
  };
}
