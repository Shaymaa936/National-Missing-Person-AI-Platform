const MissingPerson = require("../models/MissingPerson");

// Each account may file at most 3 missing-person reports in 24 hours
// (stops fake/spam reports). Admin and police enter cases for families,
// so they are not limited. Runs BEFORE the upload, so no files are saved
// for a rejected request.
const MAX_REPORTS_PER_DAY = 3;
const UNLIMITED_ROLES = ["admin", "police"];

async function dailyReportLimit(req, res, next) {
  try {
    if (!req.user || UNLIMITED_ROLES.includes(req.user.role)) return next();

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const count = await MissingPerson.countDocuments({
      reportedBy: req.user.id,
      createdAt: { $gte: since },
    });

    if (count >= MAX_REPORTS_PER_DAY) {
      return res.status(429).json({
        message: `You can file up to ${MAX_REPORTS_PER_DAY} missing-person reports in 24 hours. For an emergency call police (15).`,
      });
    }
    next();
  } catch (error) {
    console.error("[dailyReportLimit]", error.message);
    res.status(500).json({ message: "Could not check report limit. Please try again." });
  }
}

module.exports = dailyReportLimit;
module.exports.MAX_REPORTS_PER_DAY = MAX_REPORTS_PER_DAY;
