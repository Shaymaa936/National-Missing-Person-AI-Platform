const jwt = require("jsonwebtoken");

// Same as `protect`, but doesn't reject the request if there's no token —
// it just leaves req.user empty. Use this on public GET routes where the
// response should change based on whether the visitor is logged in.
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      req.user = null;
    }
  }

  next();
};

module.exports = optionalAuth;