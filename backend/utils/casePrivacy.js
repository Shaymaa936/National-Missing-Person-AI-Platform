// Rules for what the PUBLIC may see of a missing-person case.
// Police, admins and the family who filed the case see everything;
// everyone else gets this reduced view.

const CHILD_AGE_LIMIT = 18;

// Unknown age is treated as a child (safer).
function isMinor(person) {
  const age = Number(person?.age);
  return !Number.isFinite(age) || age < CHILD_AGE_LIMIT;
}

// "Anarkali Bazaar, Lahore" -> "Lahore"
function cityOnly(location) {
  const parts = String(location || "").split(",").map((p) => p.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "";
}

// "Ali Hamza Khan" -> "Ali"
function firstName(name) {
  return String(name || "").trim().split(/\s+/)[0] || "Unknown";
}

/**
 * Takes a plain case object (restricted fields like CNIC already removed)
 * and applies the public rules. Children stay hidden unless police turned
 * on a public alert.
 */
function toPublicView(obj) {
  const minor = isMinor(obj);

  delete obj.bForm;
  delete obj.relationship;
  delete obj.verificationNote;
  delete obj.verifiedBy;
  delete obj.possibleDuplicates;

  obj.isMinor = minor;
  obj.limitedView = false;

  if (minor && !obj.publicAlert) {
    obj.limitedView = true;
    obj.image = null;
    obj.name = firstName(obj.name);
    obj.lastSeenLocation = cityOnly(obj.lastSeenLocation);
    obj.description = "";
    obj.timeline = [];
    if (obj.reportedBy && typeof obj.reportedBy === "object") {
      obj.reportedBy = { name: "Family" };
    }
  }

  return obj;
}

module.exports = { CHILD_AGE_LIMIT, isMinor, cityOnly, firstName, toPublicView };
