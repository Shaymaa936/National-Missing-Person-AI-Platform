
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


// =====================================================
// USER: Submit found-person report
// =====================================================

router.post(
  "/",
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
