
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
    staffViewOnly,
} = require("../middleware/authMiddleware");
const { upload } = require("../middleware/upload");

const { uploadFound } = require("../middleware/upload");

const router = express.Router();

const optionalAuth = require("../middleware/optionalAuth");
const rateLimit = require("../middleware/rateLimit");


// =====================================================
// USER: Submit found-person report
// =====================================================

router.post(
  "/",
  // max 20 found-reports per 15 minutes per IP
  rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }),
  // sets req.user when logged in, so the report shows in the user's dashboard
  optionalAuth,
  uploadFound.single("photo"),
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
  adminOnly,
  updateReport
);


// =====================================================
// ADMIN: Approve report
// =====================================================

router.put(
  "/:id/approve",
  protect,
  adminOnly,
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
