// Formats a CNIC while the user types: digits only, dashes added
// automatically -> "35202-1234567-1". Extra digits are ignored.
export function formatCnic(value) {
  const d = String(value || "").replace(/\D/g, "").slice(0, 13);
  if (d.length <= 5) return d;
  if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
}

// true when the CNIC has all 13 digits
export function isCompleteCnic(value) {
  return /^\d{5}-\d{7}-\d$/.test(String(value || ""));
}
