const express = require("express");
const {
  getAuditLogs,
  createAuditLog,
  exportAuditLogs,
   deleteAuditLog,
} = require("../controllers/auditController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/export", protect, adminOnly, exportAuditLogs);
router.get("/", protect, adminOnly, getAuditLogs);
router.post("/", protect, adminOnly, createAuditLog);
router.delete("/:id", protect, adminOnly, deleteAuditLog);

module.exports = router;
