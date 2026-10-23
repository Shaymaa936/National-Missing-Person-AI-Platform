// Rules that stop obviously wrong AI face matches before an admin sees them.

// "Male" / "male" / "M" -> "male"; anything else (Other, Unknown, empty) -> null
function normalizeGender(value) {
  const g = String(value || "").trim().toLowerCase();
  if (g === "male" || g === "m") return "male";
  if (g === "female" || g === "f") return "female";
  return null;
}

// True only when BOTH genders are known and they differ (male vs female).
// "Other" / unknown never blocks a match, so real matches aren't lost
// when someone wasn't sure.
function isGenderConflict(foundGender, missingGender) {
  const a = normalizeGender(foundGender);
  const b = normalizeGender(missingGender);
  return !!a && !!b && a !== b;
}

// How many candidates to ask the engine for, and how many to keep after
// filtering (we ask for more so filtering doesn't leave too few).
const ENGINE_TOP_K = 10;
const MAX_MATCHES_PER_REPORT = 5;

module.exports = {
  normalizeGender,
  isGenderConflict,
  ENGINE_TOP_K,
  MAX_MATCHES_PER_REPORT,
};
