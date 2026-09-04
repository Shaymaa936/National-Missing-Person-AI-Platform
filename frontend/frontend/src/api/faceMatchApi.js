// Talks to the Node backend's /api/matches endpoints (which in turn talk
// to the Python face-detection engine). Keeps AdminDashboard.jsx focused
// on UI instead of fetch plumbing.

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

function authHeaders(token) {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export async function fetchFaceMatches(token, status) {
  const url = new URL(`${API_BASE}/api/matches`);
  if (status) url.searchParams.set("status", status);

  const res = await fetch(url, { headers: authHeaders(token) });
  if (!res.ok) throw new Error("Failed to load face matches");
  return res.json();
}

export async function runFaceMatchForReportApi(token, reportId) {
  const res = await fetch(`${API_BASE}/api/matches/run/${reportId}`, {
    method: "POST",
    headers: authHeaders(token)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to run face match");
  return data;
}

export async function runAllFaceMatchesApi(token) {
  const res = await fetch(`${API_BASE}/api/matches/run-all`, {
    method: "POST",
    headers: authHeaders(token)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to run all face matches");
  return data;
}

export async function reviewFaceMatch(token, id, decision) {
  // decision: "Confirmed" | "Rejected"
  const res = await fetch(`${API_BASE}/api/matches/${id}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ status: decision })
  });
  if (!res.ok) throw new Error("Failed to update match");
  return res.json();
}

export async function fetchEngineHealth(token) {
  const res = await fetch(`${API_BASE}/api/matches/engine-health`, {
    headers: authHeaders(token)
  });
  if (!res.ok) return { status: "offline", deepface_available: false };
  return res.json();
}

function normalizePhoto(img) {
  if (!img) return "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=400&h=500&fit=crop";
  if (img.startsWith("http://") || img.startsWith("https://") || img.startsWith("data:")) return img;
  const cleanPath = img.startsWith("/") ? img : `/${img}`;
  return `${API_BASE}${cleanPath}`;
}

// Maps a Mongo FaceMatch document (populated with report + missingPerson)
// into the flat shape MatchCard.jsx / adminMockData.js already expect,
// so we don't have to touch MatchCard at all.
export function toMockShape(match) {
  return {
    id: match._id,
    foundId: match.report?._id,
    caseId: match.missingPerson?._id,
    similarity: Math.round(match.matchPercentage || 0),
    status: (match.status || "pending").toLowerCase(), // "pending" | "confirmed" | "rejected"
    _found: match.report
      ? {
          id: match.report._id,
          photo: normalizePhoto(match.report.image),
          foundLocation: match.report.location || "Unknown"
        }
      : null,
    _case: match.missingPerson
      ? {
          id: match.missingPerson._id,
          name: match.missingPerson.name || "Unknown",
          photo: normalizePhoto(match.missingPerson.image),
          city: match.missingPerson.lastSeenLocation || "Unknown"
        }
      : null
  };
}
