const AuditLog = require("../models/AuditLog");
const User = require("../models/User");

// Get recent audit logs
// Admin sees what staff did (admin / police / ngo). Normal users' own
// actions (e.g. a family adding an FIR) are left out.
const STAFF_LOG_FILTER = { actorRole: { $ne: "user" } };
const AUDIT_KINDS = ["info", "warn", "success", "danger"];

const getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find(STAFF_LOG_FILTER).sort({ createdAt: -1 }).limit(300);
    res.status(200).json(logs);
  } catch (error) {
    console.error("Get audit logs error:", error);
    res.status(500).json({ message: "Failed to get audit logs", error: error.message });
  }
};

// Create an audit log entry
const createAuditLog = async (req, res) => {
  try {
    const action = String(req.body.action || "SYSTEM_ACTION").slice(0, 60);
    const detail = String(req.body.detail || "—").slice(0, 500);
    const kind = AUDIT_KINDS.includes(req.body.kind) ? req.body.kind : "info";
    // Actor comes from the logged-in account, never from the request body,
    // so nobody can write a log entry in someone else's name.
    const me = await User.findById(req.user.id).select("name role");
    const rawName = me?.name || "Staff";
    const actorName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    const log = await AuditLog.create({
      actor: actorName,
      actorId: req.user.id,
      actorRole: me?.role || req.user.role || "",
      action,
      detail,
      kind,
    });
    res.status(201).json(log);
  } catch (error) {
    console.error("Create audit log error:", error);
    res.status(500).json({ message: "Failed to log audit", error: error.message });
  }
};

// Export audit logs as CSV
const exportAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find(STAFF_LOG_FILTER).sort({ createdAt: -1 });
    let csv = "Timestamp,Actor,Role,Action,Detail,Kind\n";
    for (const l of logs) {
      const ts = l.createdAt ? new Date(l.createdAt).toISOString() : "";
      const act = (l.actor || "").replace(/"/g, '""');
      const action = (l.action || "").replace(/"/g, '""');
      const det = (l.detail || "").replace(/"/g, '""');
      const k = l.kind || "info";
      const role = (l.actorRole || "").replace(/"/g, '""');
      csv += `"${ts}","${act}","${role}","${action}","${det}","${k}"\n`;
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="trace_audit_logs.csv"');
    res.status(200).send(csv);
  } catch (error) {
    console.error("Export audit logs error:", error);
    res.status(500).json({ message: "Failed to export audit logs", error: error.message });
  }
};
// ===============================
// DELETE AUDIT LOG
// ===============================
const deleteAuditLog = async (req, res) => {
  try {
    const log = await AuditLog.findByIdAndDelete(req.params.id);

    if (!log) {
      return res.status(404).json({
        message: "Audit log not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Audit log deleted successfully",
    });
  } catch (error) {
    console.error("Delete audit log error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete audit log",
      error: error.message,
    });
  }
};

// ===============================
// CLEAR ALL AUDIT LOGS (admin)
// Leaves one entry saying who cleared it, so clearing is never silent.
// ===============================
const clearAuditLogs = async (req, res) => {
  try {
    const { deletedCount } = await AuditLog.deleteMany({});
    const me = await User.findById(req.user.id).select("name role");
    const rawName = me?.name || "Admin";
    const entry = await AuditLog.create({
      actor: rawName.charAt(0).toUpperCase() + rawName.slice(1),
      actorId: req.user.id,
      actorRole: me?.role || "admin",
      action: "AUDIT_CLEARED",
      detail: `${deletedCount} audit entries deleted`,
      kind: "danger",
    });
    res.status(200).json({ success: true, deletedCount, entry });
  } catch (error) {
    console.error("Clear audit logs error:", error);
    res.status(500).json({ success: false, message: "Failed to clear audit logs" });
  }
};

module.exports = {
  clearAuditLogs,
  getAuditLogs,
  createAuditLog,
  exportAuditLogs,
   deleteAuditLog,
};
