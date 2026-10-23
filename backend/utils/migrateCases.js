const MissingPerson = require("../models/MissingPerson");

// Cases created before verification existed have no verificationStatus.
// Mark them verified once so the live site doesn't suddenly go empty;
// an admin/police can move any of them back to "pending".
async function migrateCases() {
  const result = await MissingPerson.collection.updateMany(
    { verificationStatus: { $exists: false } },
    {
      $set: {
        verificationStatus: "verified",
        verificationMethod: "other",
        verificationNote: "Existing case (added before verification)",
      },
    }
  );
  if (result.modifiedCount) {
    console.log(`[migrateCases] ${result.modifiedCount} existing case(s) marked verified`);
  }
}

module.exports = { migrateCases };
