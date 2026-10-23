const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const dbUser = await User.findById(decoded.id).select("role status");
    if (!dbUser || dbUser.status === "suspended") {
      return res.status(401).json({ message: "Account disabled or not found" });
    }

    req.user = { ...decoded, id: String(dbUser._id), role: dbUser.role };
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const protectImage = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const headerToken =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

    // <img> tags can't send an Authorization header, so also accept
    // the token as ?token=... on the URL for these static file routes.
    const token = headerToken || req.query.token;

    if (!token) {
      return res.status(401).json({
        message: "Not authorized"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Suspended / deleted accounts can no longer load protected photos
    const dbUser = await User.findById(decoded.id).select("role status");
    if (!dbUser || dbUser.status === "suspended") {
      return res.status(401).json({ message: "Account disabled or not found" });
    }

    req.user = { ...decoded, id: String(dbUser._id), role: dbUser.role };

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token"
    });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      message: "Admin access required"
    });
  }

  next();
};
// Dashboard access: admin, police, ngo
const STAFF_ROLES = ["admin", "police", "ngo"];

// Review actions (change case status, approve reports/tips, run & confirm
// AI matches): admin + police
const REVIEWER_ROLES = ["admin", "police"];

const reviewerOnly = (req, res, next) => {
  if (!REVIEWER_ROLES.includes(req.user?.role)) {
    return res.status(403).json({
      message: "Police or admin access required",
    });
  }
  next();
};

const staffViewOnly = (req, res, next) => {
  if (!STAFF_ROLES.includes(req.user?.role)) {
    return res.status(403).json({
      message: "Staff access required",
    });
  }

  next();
};

// Roles allowed to see restricted case info (CNIC, family contact, FIR).
// NGO partners use the dashboard but don't see this private data.
const RESTRICTED_DATA_ROLES = ["admin", "police"];

module.exports = {
  RESTRICTED_DATA_ROLES,
  protect,
  protectImage,
  adminOnly,
  reviewerOnly,
  STAFF_ROLES,
  REVIEWER_ROLES,
    staffViewOnly,
};