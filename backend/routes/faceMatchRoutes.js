const express = require("express");

const {
  getMatches,
  updateMatch,
  runFaceMatchForReport,
  runAllFaceMatches,
  getEngineHealth
} = require("../controllers/faceMatchController");

const {
  protect,
  adminOnly,
  reviewerOnly,
  staffViewOnly
} = require("../middleware/authMiddleware");

const router = express.Router();

// STAFF: View AI engine status
router.get(
  "/engine-health",
  protect,
  staffViewOnly,
  getEngineHealth
);

// STAFF: View face-match results
router.get(
  "/",
  protect,
  staffViewOnly,
  getMatches
);

// ADMIN ONLY: Run AI
router.post(
  "/run-all",
  protect,
  adminOnly,
  runAllFaceMatches
);

// ADMIN + POLICE: run AI for one report
router.post(
  "/run/:reportId",
  protect,
  reviewerOnly,
  runFaceMatchForReport
);

// ADMIN + POLICE: confirm / reject a match
router.put(
  "/:id",
  protect,
  reviewerOnly,
  updateMatch
);

module.exports = router;