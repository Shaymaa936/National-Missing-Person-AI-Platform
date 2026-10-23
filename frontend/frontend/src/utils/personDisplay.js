// Display helpers shared by found-person cards / detail pages.

const PLACEHOLDER_NAMES = /^(unknown( person)?|unidentified( person)?|n\/?a|-+|—)$/i;

// Real name if the finder gave one, otherwise "Unidentified Person"
export function foundDisplayName(f, t) {
  const name = String(f?.name || "").trim();
  if (!name || PLACEHOLDER_NAMES.test(name)) return t("found.unidentified");
  return name;
}

export function isIdentified(f) {
  const name = String(f?.name || "").trim();
  return !!name && !PLACEHOLDER_NAMES.test(name);
}

// Data comes as "Male" / "male" / "other" — normalise before translating
export function genderLabel(gender, t) {
  const g = String(gender || "").toLowerCase();
  if (g === "male") return t("common.male");
  if (g === "female") return t("common.female");
  if (g) return t("common.other");
  return "—";
}
