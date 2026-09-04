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

router.post("/", submitTip);

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