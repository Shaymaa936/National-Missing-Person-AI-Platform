const crypto = require("crypto");

// Generates IDs like "MP-2026-7F3A9C".
// The old 4-digit random number only had 9,000 options, so after ~100 cases two
// reports would often get the same ID and creation failed (caseId is unique).
// 6 hex characters give ~16.7 million options per year.
function generateCaseId(prefix) {
  const year = new Date().getFullYear();
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${year}-${random}`;
}

module.exports = { generateCaseId };
