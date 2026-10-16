const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Where photos are stored. On the VPS set UPLOAD_DIR in .env to a folder
// OUTSIDE the project (e.g. /var/trace-uploads) so redeploying or re-cloning
// the code never deletes uploaded photos. Falls back to backend/uploads.
const UPLOAD_ROOT = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, "../uploads");

const missingDir = path.join(UPLOAD_ROOT, "missing");
const firDir = path.join(UPLOAD_ROOT, "fir");
const foundDir = path.join(UPLOAD_ROOT, "found");

// Turns a stored public path like "/uploads/missing/abc.jpg" into the real
// file path on disk, wherever UPLOAD_ROOT is.
function resolveUploadPath(publicPath) {
  const relative = String(publicPath || "").replace(/^\/?uploads\//, "");
  return path.join(UPLOAD_ROOT, relative);
}

// Create folders if they don't exist
fs.mkdirSync(missingDir, { recursive: true });
fs.mkdirSync(firDir, { recursive: true });
fs.mkdirSync(foundDir, { recursive: true });
const ALLOWED_EXT = [".jpg", ".jpeg", ".jfif", ".png", ".webp", ".gif"];

const imageFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (file.mimetype.startsWith("image/") && ALLOWED_EXT.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};


// =========================
// MISSING PERSON UPLOAD
// =========================

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === "photo") {
      cb(null, missingDir);
    } else if (file.fieldname === "firFile") {
      cb(null, firDir);
    } else {
      // Without this the request hangs forever on an unexpected field name
      cb(new Error(`Unexpected upload field: ${file.fieldname}`));
    }
  },

  filename: function (req, file, cb) {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname).toLowerCase();

    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: imageFilter,
});


// =========================
// FOUND PERSON UPLOAD
// =========================

const foundStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, foundDir);
  },

  filename: function (req, file, cb) {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname).toLowerCase();

    cb(null, uniqueName);
  },
});

const uploadFound = multer({
  storage: foundStorage,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: imageFilter,
});

  



// =========================
// EXPORT
// =========================

module.exports = {
  upload,
  uploadFound,
  UPLOAD_ROOT,
  resolveUploadPath,
};