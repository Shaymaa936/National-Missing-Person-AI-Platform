const path = require("path");
const jwt = require("jsonwebtoken");
const MissingPerson = require("../models/MissingPerson");
const User = require("../models/User");
const { RESTRICTED_DATA_ROLES } = require("./authMiddleware");

// Missing-person photos are public, EXCEPT when the family unticked
// "show photo publicly". Those files are only served to police/admin or
// the account that filed the report, even if someone has the direct URL.
async function missingPhotoGuard(req, res, next) {
  try {
    const file = path.basename(decodeURIComponent(req.path));
    const person = await MissingPerson.findOne({
      image: `/uploads/missing/${file}`,
    }).select("photoPublic reportedBy");

    if (!person || person.photoPublic !== false) return next();

    const authHeader = req.headers.authorization;
    const token =
      (authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null) || req.query.token;
    if (!token) {
      return res.status(403).json({ message: "This photo is private" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("role status");
    if (!user || user.status === "suspended") {
      return res.status(403).json({ message: "This photo is private" });
    }

    const isOwner =
      person.reportedBy && String(person.reportedBy) === String(user._id);
    if (RESTRICTED_DATA_ROLES.includes(user.role) || isOwner) return next();

    return res.status(403).json({ message: "This photo is private" });
  } catch (error) {
    return res.status(403).json({ message: "This photo is private" });
  }
}

module.exports = missingPhotoGuard;
