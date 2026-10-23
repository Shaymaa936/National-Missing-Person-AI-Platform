// One-time copy of photos that were uploaded BEFORE Cloudinary was set up.
// Run it on the machine that actually has the photos in backend/uploads:
//
//   cd backend
//   node scripts/syncUploadsToCloudinary.js
//
// Safe to run again: files already in Cloudinary are simply overwritten.

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { UPLOAD_ROOT } = require("../middleware/upload");
const cloudStorage = require("../services/cloudStorage");

(async () => {
  if (!cloudStorage.isEnabled()) {
    console.error("Cloudinary is not configured. Add CLOUDINARY_URL (or the 3 CLOUDINARY_* values) to backend/.env first.");
    process.exit(1);
  }

  let ok = 0;
  let failed = 0;
  for (const folder of ["missing", "found", "fir"]) {
    const dir = path.join(UPLOAD_ROOT, folder);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter((f) => /\.(jpe?g|jfif|png|webp|gif)$/i.test(f));
    for (const file of files) {
      const publicPath = `/uploads/${folder}/${file}`;
      try {
        await cloudStorage.uploadFile(path.join(dir, file), publicPath);
        ok++;
        console.log("copied", publicPath);
      } catch (err) {
        failed++;
        console.error("FAILED", publicPath, "-", err.message);
      }
    }
  }
  console.log(`\nDone: ${ok} copied, ${failed} failed.`);
  process.exit(failed ? 1 : 0);
})();
