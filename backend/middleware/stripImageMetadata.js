const fs = require("fs");

// Phone photos carry hidden EXIF data: GPS location, date/time, phone model.
// This runs right after multer saves an upload and re-saves the image:
//   - turns it the right way up (uses the EXIF rotation before removing it)
//   - removes ALL metadata (GPS location etc.)
//   - shrinks very large photos to max 1600px (faster pages + AI)
//   - rejects files that aren't real images (renamed .exe, broken files)
// If the "sharp" package isn't installed it only logs a warning, so uploads
// keep working (run `npm install` in backend/ to enable it).

let sharp = null;
try {
  sharp = require("sharp");
} catch (err) {
  console.warn("[stripImageMetadata] sharp not installed - photo metadata will NOT be removed. Run npm install.");
}

const path = require("path");
const cloudStorage = require("../services/cloudStorage");

const MAX_SIDE = 1600;

// After cleaning, keep a copy in Cloudinary (when configured) so the photo
// also shows on machines that don't have this local file. A Cloudinary error
// never blocks the upload: the local file still works on this machine.
async function mirrorToCloud(files) {
  if (!cloudStorage.isEnabled()) return;
  for (const file of files) {
    const folder = path.basename(file.destination || path.dirname(file.path));
    const publicPath = `/uploads/${folder}/${file.filename}`;
    try {
      await cloudStorage.uploadFile(file.path, publicPath);
    } catch (err) {
      console.error(`[cloudStorage] ${publicPath} not copied to Cloudinary:`, err.message);
    }
  }
}

function uploadedFiles(req) {
  const list = [];
  if (req.file) list.push(req.file);
  if (req.files) {
    const groups = Array.isArray(req.files) ? [req.files] : Object.values(req.files);
    for (const group of groups) list.push(...group);
  }
  return list;
}

async function cleanOne(file) {
  const input = await fs.promises.readFile(file.path);
  const image = sharp(input, { failOn: "error" });
  const meta = await image.metadata();

  let pipeline = image
    .rotate() // apply EXIF orientation, then metadata is dropped on output
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true });

  // keep the same format as the uploaded file
  if (meta.format === "png") pipeline = pipeline.png();
  else if (meta.format === "webp") pipeline = pipeline.webp({ quality: 88 });
  else if (meta.format === "gif") pipeline = pipeline.gif();
  else pipeline = pipeline.jpeg({ quality: 88, mozjpeg: true });

  // sharp never copies metadata unless .withMetadata() is called
  const output = await pipeline.toBuffer();
  await fs.promises.writeFile(file.path, output);
  file.size = output.length;
}

async function stripImageMetadata(req, res, next) {
  const files = uploadedFiles(req);
  if (!sharp) {
    await mirrorToCloud(files);
    return next();
  }

  try {
    for (const file of files) {
      await cleanOne(file);
    }
  } catch (err) {
    // not a real / readable image: delete what was saved and refuse
    for (const file of files) {
      fs.promises.unlink(file.path).catch(() => {});
    }
    return res.status(400).json({ message: "Invalid or damaged image file. Please upload a JPG, PNG or WEBP photo." });
  }

  await mirrorToCloud(files);
  next();
}

module.exports = stripImageMetadata;
