// Diagnostic: which photos in the database have their file on THIS PC?
// Run from backend/:  node scripts/checkPhotos.js
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { UPLOAD_ROOT } = require("../middleware/upload");

(async () => {
  await mongoose.connect(process.env.MONGO_URL, { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;
  for (const col of ["missingpersons", "reports"]) {
    const docs = await db.collection(col).find({}, { projection: { image: 1, caseId: 1, name: 1 } }).toArray();
    let here = 0, notHere = 0, none = 0, other = 0;
    const notHereList = [], otherList = [];
    for (const d of docs) {
      const im = d.image || "";
      if (!im) { none++; continue; }
      const m = im.match(/^\/?uploads\/([a-z]+)\/(.+)$/);
      if (!m) { other++; otherList.push(`${d.caseId}: ${im.slice(0, 80)}`); continue; }
      if (fs.existsSync(path.join(UPLOAD_ROOT, m[1], m[2]))) here++;
      else { notHere++; notHereList.push(`${d.caseId}: ${im}`); }
    }
    console.log(`\n${col}: ${docs.length} total | file on this PC: ${here} | file NOT on this PC: ${notHere} | no photo: ${none} | other format: ${other}`);
    notHereList.slice(0, 8).forEach((l) => console.log("   missing file ->", l));
    otherList.slice(0, 5).forEach((l) => console.log("   other format ->", l));
  }
  process.exit(0);
})().catch((e) => { console.error("Check failed:", e.message); process.exit(1); });
