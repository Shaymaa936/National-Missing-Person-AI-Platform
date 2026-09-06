const multer = require("multer");
const path = require("path");
const fs = require("fs");

const missingDir = path.join(__dirname, "../uploads/missing");
const firDir = path.join(__dirname, "../uploads/fir");
const foundDir = path.join(__dirname, "../uploads/found");

// Create folders if they don't exist
fs.mkdirSync(missingDir, { recursive: true });
fs.mkdirSync(firDir, { recursive: true });
fs.mkdirSync(foundDir, { recursive: true });


// =========================
// MISSING PERSON UPLOAD
// =========================

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === "photo") {
      cb(null, missingDir);
    } else if (file.fieldname === "firFile") {
      cb(null, firDir);
    }
  },

  filename: function (req, file, cb) {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
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
      path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

const uploadFound = multer({
  storage: foundStorage,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});


// =========================
// EXPORT
// =========================

module.exports = {
  upload,
  uploadFound,
};