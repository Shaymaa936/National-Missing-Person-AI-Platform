const AuditLog = require("../models/AuditLog");

// Get recent audit logs
const getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
    res.status(200).json(logs);
  } catch (error) {
    console.error("Get audit logs error:", error);
    res.status(500).json({ message: "Failed to get audit logs", error: error.message });
  }
};

// Create an audit log entry
const createAuditLog = async (req, res) => {
  try {
    const { action, detail, kind, actor } = req.body;
    const actorName = actor || req.user?.name || "Admin User";
    const log = await AuditLog.create({
      actor: actorName,
      actorId: req.user?._id,
      action: action || "SYSTEM_ACTION",
      detail: detail || "—",
      kind: kind || "info",
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
    const logs = await AuditLog.find().sort({ createdAt: -1 });
    let csv = "Timestamp,Actor,Action,Detail,Kind\n";
    for (const l of logs) {
      const ts = l.createdAt ? new Date(l.createdAt).toISOString() : "";
      const act = (l.actor || "").replace(/"/g, '""');
      const action = (l.action || "").replace(/"/g, '""');
      const det = (l.detail || "").replace(/"/g, '""');
      const k = l.kind || "info";
      csv += `"${ts}","${act}","${action}","${det}","${k}"\n`;
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

module.exports = {
  getAuditLogs,
  createAuditLog,
  exportAuditLogs,
   deleteAuditLog,
};
