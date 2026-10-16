require('dns').setServers(['8.8.8.8', '8.8.4.4']);

dns = require('dns');
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
const path = require("path");
const multer = require("multer");
const { UPLOAD_ROOT } = require("./middleware/upload");
const rateLimit = require("./middleware/rateLimit");

const connectDB = require("./config/db")

const app = express();

// Behind Nginx: lets req.ip be the real visitor IP (needed for rate limiting)
app.set("trust proxy", 1);
connectDB();

const { protect, protectImage } = require("./middleware/authMiddleware");

// found-person and other general uploads stay public
app.use("/uploads/found", express.static(path.join(UPLOAD_ROOT, "found")));

// missing-person photos + FIR scans are only servable to logged-in users
app.use(
  "/uploads/missing",
  protectImage,
  express.static(path.join(UPLOAD_ROOT, "missing"))
);
app.use(
  "/uploads/fir",
  protectImage,
  express.static(path.join(UPLOAD_ROOT, "fir"))
);

app.use(cors());
app.use(express.json({ limit: "15mb" }));
// Max 10 login attempts per 15 minutes per IP (stops password guessing)
app.use(
  "/api/auth/login",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: "Too many login attempts. Please try again in 15 minutes." })
);
app.use("/api/auth", authRoutes);
app.use("/api/person", personRoutes);
app.use("/api/report", reportRoutes);
app.use("/api/tips", tipRoutes);
app.use("/api/matches", faceMatchRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/v1/contact", contactRoutes);
// Max 20 chatbot messages per minute per IP (protects Groq credits)
app.use("/api/chat", rateLimit({ windowMs: 60 * 1000, max: 20 }), chatRoutes);

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