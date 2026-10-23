const express = require("express");
const {
  getAuditLogs,
  createAuditLog,
  exportAuditLogs,
   deleteAuditLog,
  clearAuditLogs,
} = require("../controllers/auditController");
const { protect, adminOnly, staffViewOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/export", protect, adminOnly, exportAuditLogs);
router.get("/", protect, adminOnly, getAuditLogs);
// police / ngo actions are logged too (admin is the only one who reads them)
router.post("/", protect, staffViewOnly, createAuditLog);
router.delete("/", protect, adminOnly, clearAuditLogs);
router.delete("/:id", protect, adminOnly, deleteAuditLog);

module.exports = router;
