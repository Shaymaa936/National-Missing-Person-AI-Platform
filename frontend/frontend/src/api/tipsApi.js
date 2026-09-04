// Talks to the Node backend's /api/tips endpoints for the admin
// "Community Tips" panel (list all tips, mark reviewed, delete).

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

function authHeaders(token) {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchAllTips(token) {
  const res = await fetch(`${API_BASE}/api/tips`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to load tips");
  return res.json();
}

export async function updateTipStatusApi(token, id, status) {
  const res = await fetch(`${API_BASE}/api/tips/${id}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to update tip");
  return data;
}

export async function deleteTipApi(token, id) {
  const res = await fetch(`${API_BASE}/api/tips/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to delete tip");
  return data;
}

// Maps a Mongo Tip document (optionally populated with its case) into
// the flat shape the AdminDashboard "tips" section already renders.
export function toTipShape(t) {
  return {
    id: t._id,
    caseId: t.caseTrackingId || t.caseId?.caseId || t.caseId,
    caseName: t.caseId?.name,
    name: t.name || "Anonymous",
    date: t.createdAt,
    location: t.location || "—",
    msg: t.message,
    status: (t.status || "pending").toLowerCase(),
  };
}
