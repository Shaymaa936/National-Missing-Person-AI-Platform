require('dns').setServers(['8.8.8.8', '8.8.4.4']);

const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

require("dotenv").config();


const express = require('express');
const cors = require('cors');

const authRoutes = require("./routes/authRoutes");
const personRoutes = require("./routes/personRoutes");
const reportRoutes = require("./routes/reportRoutes");
const tipRoutes = require("./routes/tipRoutes");
const faceMatchRoutes = require("./routes/faceMatchRoutes");
const auditRoutes = require("./routes/auditRoutes");
const contactRoutes = require("./routes/contactRoutes");
const chatRoutes = require("./routes/chatRoutes");
const shareRoutes = require("./routes/shareRoutes");
const path = require("path");
const multer = require("multer");
const { UPLOAD_ROOT } = require("./middleware/upload");
// Serves the Cloudinary copy when this machine doesn't have the file
const { cloudFallback } = require("./services/cloudStorage");
const rateLimit = require("./middleware/rateLimit");

const connectDB = require("./config/db")

const app = express();

// Behind Nginx: lets req.ip be the real visitor IP (needed for rate limiting)
app.set("trust proxy", 1);
connectDB();

const { protect, protectImage } = require("./middleware/authMiddleware");

// found-person and other general uploads stay public
app.use("/uploads/found", express.static(path.join(UPLOAD_ROOT, "found")), cloudFallback("found"));

// Missing-person photos are public (like a missing-person poster) so anyone
// can recognise them and send a tip, unless the family chose to keep the
// photo private. FIR scans stay login-only.
const missingPhotoGuard = require("./middleware/missingPhotoGuard");
app.use(
  "/uploads/missing",
  missingPhotoGuard,
  express.static(path.join(UPLOAD_ROOT, "missing")),
  cloudFallback("missing")
);
app.use(
  "/uploads/fir",
  protectImage,
  express.static(path.join(UPLOAD_ROOT, "fir")),
  cloudFallback("fir")
);

// Basic security headers (no extra package needed).
// Referrer-Policy also stops the ?token= in image URLs leaking to other sites.
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.removeHeader("X-Powered-By");
  next();
});

// CORS: set CORS_ORIGINS in .env (comma-separated, e.g. https://trace.pk)
// to only allow your frontend. Left empty = allow all (old behaviour).
const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
app.use(
  cors(
    allowedOrigins.length
      ? {
          origin: (origin, cb) =>
            !origin || allowedOrigins.includes(origin)
              ? cb(null, true)
              : cb(null, false),
        }
      : undefined
  )
);
app.use(express.json({ limit: "15mb" }));
// Max 10 login attempts per 15 minutes per IP (stops password guessing)
app.use(
  "/api/auth/login",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: "Too many login attempts. Please try again in 15 minutes." })
);
// Max 20 signups per 15 minutes per IP (stops fake-account spam)
app.use(
  "/api/auth/signup",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: "Too many signups from this network. Please try again later." })
);
app.use("/api/auth", authRoutes);
app.use("/api/person", personRoutes);
app.use("/api/report", reportRoutes);
app.use("/api/tips", tipRoutes);
app.use("/api/matches", faceMatchRoutes);
app.use("/api/audit", auditRoutes);
// Max 10 contact messages per 15 minutes per IP (stops spam)
const contactLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
app.post(["/api/contact", "/api/v1/contact"], contactLimiter);
app.use("/api/contact", contactRoutes);
app.use("/api/v1/contact", contactRoutes);
// Max 20 chatbot messages per minute per IP (protects Groq credits)
app.use("/api/chat", rateLimit({ windowMs: 60 * 1000, max: 20 }), chatRoutes);

// Share links with WhatsApp / Facebook preview (photo + name)
app.use("/share", shareRoutes);

app.get("/",(req,res)=>
{
    res.json({
        message: "TraceAI Backend is running" 
    });
});

// Upload errors (wrong file type, file too big) return a clear 400 JSON
// message instead of a generic HTML 500 page.
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Photo is too large. Maximum size is 5MB."
        : err.message;
    return res.status(400).json({ message });
  }

  if (err && /^(Only image files are allowed|Unexpected upload field)/.test(err.message)) {
    return res.status(400).json({ message: err.message });
  }

  console.error("UNHANDLED ERROR:", err);
  res.status(500).json({ message: "Something went wrong on the server." });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT ,() => {
    console.log(`Server running on port ${PORT}`);
});