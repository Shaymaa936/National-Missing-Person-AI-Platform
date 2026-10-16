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
  staffViewOnly,
} = require("../middleware/authMiddleware");

const rateLimit = require("../middleware/rateLimit");

// max 20 tips per 15 minutes per IP
router.post("/", rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }), submitTip);

router.get("/case/:caseId", getCaseTips);

// STAFF: View tips
router.get(
  "/",
  protect,
  staffViewOnly,
  getAllTips
);

// ADMIN ONLY: Change/delete
router.put(
  "/:id",
  protect,
  adminOnly,
  updateTipStatus
);

router.delete(
  "/:id",
  protect,
  adminOnly,
  deleteTip
);

module.exports = router;