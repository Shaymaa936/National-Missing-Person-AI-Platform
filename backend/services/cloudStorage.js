// Cloudinary copy of every uploaded photo.
//
// Why: photos were only saved in backend/uploads on the machine that received
// the upload. With a shared MongoDB Atlas database, every other machine (a
// teammate's laptop, the VPS) has the photo path in the DB but not the file,
// so the image shows broken. Now each upload is also stored in Cloudinary and
// any machine that doesn't have the file locally fetches it from there.
//
// Privacy stays the same:
//   - missing-person photos and FIR scans are stored as PRIVATE Cloudinary
//     files; nobody can open them without a short-lived signed link, which the
//     backend only hands out after the existing checks (missingPhotoGuard /
//     protectImage) pass.
//   - found-person photos are public, as before.
//
// No extra npm package: uses axios (already installed) + Node's crypto.
// Turned on by CLOUDINARY_URL, or CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY +
// CLOUDINARY_API_SECRET in .env. Not set = local disk only (old behaviour).

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const axios = require("axios");

const ROOT_FOLDER = (process.env.CLOUDINARY_FOLDER || "trace").replace(/^\/+|\/+$/g, "");
const PRIVATE_FOLDERS = ["missing", "fir"];
const KNOWN_FOLDERS = ["missing", "fir", "found"];
const SIGNED_LINK_SECONDS = 10 * 60;

function config() {
  const url = process.env.CLOUDINARY_URL || "";
  const m = url.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
  if (m) return { apiKey: m[1], apiSecret: m[2], cloudName: m[3] };
  const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = process.env;
  if (cloudName && apiKey && apiSecret) return { cloudName, apiKey, apiSecret };
  return null;
}

function isEnabled() {
  return !!config();
}

// Cloudinary signature: sorted "key=value" pairs joined by & + secret, SHA-1
function sign(params, apiSecret) {
  const toSign = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== "")
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return crypto.createHash("sha1").update(toSign + apiSecret).digest("hex");
}

// "/uploads/missing/123-456.jpg" -> { folder, publicId, format, type }
function describe(publicPath) {
  const m = String(publicPath || "").match(/^\/?uploads\/([a-z]+)\/([A-Za-z0-9._-]+)$/);
  if (!m || !KNOWN_FOLDERS.includes(m[1])) return null;
  const folder = m[1];
  const ext = path.extname(m[2]);
  const base = path.basename(m[2], ext);
  if (!base) return null;
  return {
    folder,
    publicId: `${ROOT_FOLDER}/${folder}/${base}`,
    format: (ext.replace(".", "") || "jpg").toLowerCase(),
    type: PRIVATE_FOLDERS.includes(folder) ? "private" : "upload",
  };
}

const api = (cfg, action) => `https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/${action}`;

// Upload one local file (already cleaned by stripImageMetadata)
async function uploadFile(absPath, publicPath) {
  const cfg = config();
  const info = describe(publicPath);
  if (!cfg || !info) return null;

  const params = {
    public_id: info.publicId,
    type: info.type,
    overwrite: "true",
    timestamp: Math.floor(Date.now() / 1000),
  };
  const form = new FormData();
  const bytes = await fs.promises.readFile(absPath);
  form.append("file", new Blob([bytes]), path.basename(absPath));
  for (const [k, v] of Object.entries(params)) form.append(k, String(v));
  form.append("api_key", cfg.apiKey);
  form.append("signature", sign(params, cfg.apiSecret));

  const res = await fetch(api(cfg, "upload"), { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `Cloudinary upload failed (${res.status})`);
  return data;
}

// Link to the Cloudinary copy: public URL for found photos, a signed link
// that expires in 10 minutes for private ones
function deliveryUrl(publicPath) {
  const cfg = config();
  const info = describe(publicPath);
  if (!cfg || !info) return null;

  if (info.type === "upload") {
    return `https://res.cloudinary.com/${cfg.cloudName}/image/upload/${info.publicId}.${info.format}`;
  }
  const params = {
    public_id: info.publicId,
    format: info.format,
    type: "private",
    timestamp: Math.floor(Date.now() / 1000),
    expires_at: Math.floor(Date.now() / 1000) + SIGNED_LINK_SECONDS,
  };
  const qs = new URLSearchParams({
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    api_key: cfg.apiKey,
    signature: sign(params, cfg.apiSecret),
  });
  return `${api(cfg, "download")}?${qs.toString()}`;
}

async function deleteFile(publicPath) {
  const cfg = config();
  const info = describe(publicPath);
  if (!cfg || !info) return false;
  const params = { public_id: info.publicId, type: info.type, invalidate: "true", timestamp: Math.floor(Date.now() / 1000) };
  const form = new URLSearchParams({
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    api_key: cfg.apiKey,
    signature: sign(params, cfg.apiSecret),
  });
  try {
    const res = await fetch(api(cfg, "destroy"), { method: "POST", body: form });
    return res.ok;
  } catch (err) {
    console.error("[cloudStorage] delete failed:", err.message);
    return false;
  }
}

// Photo as base64 for the face engine: local file if this machine has it,
// otherwise downloaded from Cloudinary
async function readBase64(publicPath, resolveUploadPath) {
  const abs = resolveUploadPath(publicPath);
  if (fs.existsSync(abs)) return fs.promises.readFile(abs, { encoding: "base64" });
  const url = deliveryUrl(publicPath);
  if (!url) throw new Error(`Photo not found on this machine: ${publicPath}`);
  const res = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
  return Buffer.from(res.data).toString("base64");
}

// Express middleware placed right AFTER express.static for an uploads folder:
// static serves the file when it exists here; otherwise send the browser to
// the Cloudinary copy. The privacy middleware before static has already run.
function cloudFallback(folder) {
  return (req, res, next) => {
    if (!isEnabled() || (req.method !== "GET" && req.method !== "HEAD")) return next();
    const file = path.basename(decodeURIComponent(req.path));
    const url = deliveryUrl(`/uploads/${folder}/${file}`);
    if (!url) return next();
    res.setHeader("Cache-Control", PRIVATE_FOLDERS.includes(folder) ? "private, no-store" : "public, max-age=3600");
    return res.redirect(302, url);
  };
}

module.exports = { isEnabled, describe, uploadFile, deliveryUrl, deleteFile, readBase64, cloudFallback, sign };
