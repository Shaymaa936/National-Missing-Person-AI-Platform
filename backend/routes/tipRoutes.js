const express = require("express");

const router = express.Router();

const {
  submitTip,
  getCaseTips,
  getAllTips,
  updateTipStatus,
  deleteTip,
} = require("../controllers/tipController");

const {
  protect,
  adminOnly,
  reviewerOnly,
  staffViewOnly,
} = require("../middleware/authMiddleware");

const rateLimit = require("../middleware/rateLimit");
const optionalAuth = require("../middleware/optionalAuth");
const verifyTurnstile = require("../middleware/verifyTurnstile");

// max 20 tips per 15 minutes per IP
// optionalAuth: tips from logged-in accounts get a "verified" badge
router.post("/", rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }), verifyTurnstile, optionalAuth, submitTip);

// optionalAuth: police/admin/family get full tips, public only sees a count
router.get("/case/:caseId", optionalAuth, getCaseTips);

// STAFF: View tips
router.get(
  "/",
  protect,
  staffViewOnly,
  getAllTips
);

// ADMIN + POLICE: approve / reject tips. Delete stays admin only.
router.put(
  "/:id",
  protect,
  reviewerOnly,
  updateTipStatus
);

router.delete(
  "/:id",
  protect,
  adminOnly,
  deleteTip
);

module.exports = router;