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

router.post(
  "/run/:reportId",
  protect,
  adminOnly,
  runFaceMatchForReport
);

// ADMIN ONLY: Update match
router.put(
  "/:id",
  protect,
  adminOnly,
  updateMatch
);

module.exports = router;