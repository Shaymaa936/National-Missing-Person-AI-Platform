const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Same as `protect`, but doesn't reject the request if there's no token —
// it just leaves req.user empty. Use this on public GET routes where the
// response should change based on whether the visitor is logged in.
// Role/status are read from the database (not trusted from the token), so a
// demoted or suspended account loses access straight away.
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const dbUser = await User.findById(decoded.id).select("role status");
      req.user =
        dbUser && dbUser.status !== "suspended"
          ? { ...decoded, id: String(dbUser._id), role: dbUser.role }
          : null;
    } catch (error) {
      req.user = null;
    }
  }

  next();
};

module.exports = optionalAuth;