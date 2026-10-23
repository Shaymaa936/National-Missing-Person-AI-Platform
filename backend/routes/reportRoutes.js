
const express = require("express");

const {
  createReport,
  getReports,
  getPublicReports,
  getMyReports,
  updateReport,
  approveReport,
  deleteReport,
} = require("../controllers/reportController");

const {
  protect,
  adminOnly,
  reviewerOnly,
    staffViewOnly,
} = require("../middleware/authMiddleware");
const { upload } = require("../middleware/upload");

const { uploadFound } = require("../middleware/upload");
const stripImageMetadata = require("../middleware/stripImageMetadata");

const router = express.Router();

const optionalAuth = require("../middleware/optionalAuth");
const rateLimit = require("../middleware/rateLimit");
const verifyTurnstile = require("../middleware/verifyTurnstile");


// =====================================================
// USER: Submit found-person report
// =====================================================

router.post(
  "/",
  // max 20 found-reports per 15 minutes per IP
  rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }),
  verifyTurnstile, // captcha (only when TURNSTILE_SECRET_KEY is set)
  // sets req.user when logged in, so the report shows in the user's dashboard
  optionalAuth,
  uploadFound.single("photo"),
  stripImageMetadata, // removes GPS/EXIF, rejects non-images
  createReport
);


// =====================================================
// PUBLIC: Only verified reports
// =====================================================

router.get(
  "/public",
  getPublicReports
);


// =====================================================
// USER: Logged-in user's own reports
// =====================================================

router.get(
  "/my-reports",
  protect,
  getMyReports
);


// =====================================================
// ADMIN: Get ALL reports
// Pending + Verified + Rejected
// Any admin account can see them
// =====================================================

router.get(
  "/",
  protect,
  
 staffViewOnly,
  getReports
);


// =====================================================
// ADMIN: Update report
// =====================================================

router.put(
  "/:id",
  protect,
  reviewerOnly,
  updateReport
);


// =====================================================
// ADMIN: Approve report
// =====================================================

router.put(
  "/:id/approve",
  protect,
  reviewerOnly,
  approveReport
);


// =====================================================
// ADMIN: Delete report
// =====================================================

router.delete(
  "/:id",
  protect,
  adminOnly,
  deleteReport
);


module.exports = router;
