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

const protectImage =  (req, res, next) => {
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

    req.user = decoded;

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
const staffViewOnly = (req, res, next) => {
  const staffRoles = [
    "admin",
    "investigator",
    "police",
    "dpo",
    "reporter",
    "tipster",
    "ngo",
  ];

  if (!staffRoles.includes(req.user?.role)) {
    return res.status(403).json({
      message: "Staff access required",
    });
  }

  next();
};

module.exports = {
  protect,
  protectImage,
  adminOnly,
    staffViewOnly,
};