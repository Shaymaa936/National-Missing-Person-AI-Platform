// Talks to the Node backend's /api/auth/users endpoints for the
// admin "Users & Roles" panel (list, change role, suspend/reactivate, delete).

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

export async function fetchUsers(token) {
  const res = await fetch(`${API_BASE}/api/auth/users`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to load users");
  return res.json();
}

export async function updateUserRoleApi(token, id, role) {
  const res = await fetch(`${API_BASE}/api/auth/users/${id}/role`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ role }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to update role");
  return data;
}

export async function updateUserStatusApi(token, id, status) {
  const res = await fetch(`${API_BASE}/api/auth/users/${id}/status`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to update status");
  return data;
}

export async function deleteUserApi(token, id) {
  const res = await fetch(`${API_BASE}/api/auth/users/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to delete user");
  return data;
}

// Maps a Mongo User document into the flat shape the AdminDashboard
// table / adminMockData.js helpers (roleLabel, fmtAdmin) already expect.
export function toUserShape(u) {
  return {
    id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    joined: u.createdAt,
  };
}
