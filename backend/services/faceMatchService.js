const axios = require("axios");

// URL of the standalone Python face-detection microservice (face_dtc).
// Set FACE_ENGINE_URL in .env when deploying (e.g. http://localhost:8000).
const FACE_ENGINE_URL = process.env.FACE_ENGINE_URL || "http://localhost:8000";

const client = axios.create({
  baseURL: FACE_ENGINE_URL,
  timeout: 15000
});

/**
 * Registers a missing person's photo with the face engine so it can be
 * matched against later. Returns the engine's case_id (e.g. "MP-XXXXXXXX")
 * on success, or null if the engine call fails (never throws — a missing
 * face-engine registration should not block creating the case in Mongo).
 *
 * @param {Object} params
 * @param {string} params.name
 * @param {number} [params.age]
 * @param {string} [params.gender]
 * @param {string} [params.missingSince] - date string
 * @param {string} params.lastSeenLocation
 * @param {string} params.contactNumber
 * @param {string} [params.notes]
 * @param {string} params.imageBase64 - raw base64 or data URL of the photo
 */
async function registerMissingFace({
  name,
  age,
  gender,
  missingSince,
  lastSeenLocation,
  contactNumber,
  notes,
  imageBase64
}) {
  if (!imageBase64) return null;

  try {
    const { data } = await client.post("/api/missing/register", {
      name,
      age,
      gender,
      missing_since: missingSince,
      last_seen_location: lastSeenLocation,
      contact_number: contactNumber,
      notes,
      image: imageBase64
    });

    if (data?.success && data?.case?.id) {
      return data.case.id;
    }
    return null;
  } catch (error) {
    console.error("[faceMatchService] register failed:", error.message);
    return null;
  }
}

/**
 * Searches the face engine's missing-person database for candidates that
 * match the given photo (typically a found-person report photo).
 * Returns the engine's raw `results` array (one entry per detected face,
 * each with `candidates: [{ id, name, match_percentage, confidence_tier, ... }]`),
 * or an empty array if the engine call fails.
 *
 * @param {string} imageBase64
 * @param {Object} [options]
 * @param {number} [options.topK=5]
 * @param {number} [options.threshold=0.30]
 */
async function searchFaceMatches(imageBase64, { topK = 5, threshold = 0.3 } = {}) {
  if (!imageBase64) return [];

  try {
    const { data } = await client.post("/api/missing/search", {
      image: imageBase64,
      top_k: topK,
      threshold
    });

    if (data?.success) {
      return data.results || [];
    }
    return [];
  } catch (error) {
    console.error("[faceMatchService] search failed:", error.message);
    return [];
  }
}

/**
 * Updates a case's status on the face-engine side too, so both databases
 * (Mongo + the engine's own JSON store) stay in sync once an admin
 * confirms a match or closes a case.
 *
 * @param {string} faceEngineId
 * @param {"Missing"|"Found"} status
 */
async function updateFaceEngineStatus(faceEngineId, status) {
  if (!faceEngineId) return false;

  try {
    const { data } = await client.put(`/api/missing/cases/${faceEngineId}/status`, {
      status
    });
    return !!data?.success;
  } catch (error) {
    console.error("[faceMatchService] status update failed:", error.message);
    return false;
  }
}

/**
 * Quick health check — used so the admin dashboard can show whether the
 * AI engine is online before relying on it.
 */
async function checkEngineHealth() {
  try {
    const { data } = await client.get("/api/health");
    return data;
  } catch (error) {
    return { status: "offline", deepface_available: false };
  }
}

module.exports = {
  registerMissingFace,
  searchFaceMatches,
  updateFaceEngineStatus,
  checkEngineHealth
};
