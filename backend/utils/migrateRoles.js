const User = require("../models/User");

// Old 8-role setup -> new 4 roles. Runs once on every server start; does
// nothing when there is nothing left to convert.
const LEGACY_ROLE_MAP = {
  investigator: "police",
  dpo: "ngo",
  reporter: "ngo",
  tipster: "ngo",
};

async function migrateRoles() {
  for (const [oldRole, newRole] of Object.entries(LEGACY_ROLE_MAP)) {
    const result = await User.collection.updateMany(
      { role: oldRole },
      { $set: { role: newRole } }
    );
    if (result.modifiedCount) {
      console.log(`[migrateRoles] ${result.modifiedCount} "${oldRole}" account(s) -> "${newRole}"`);
    }
  }
}

module.exports = { migrateRoles, LEGACY_ROLE_MAP };
