const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: String,
      default: "Admin User",
      trim: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // admin / police / ngo / user — the admin log hides "user" entries
    actorRole: {
      type: String,
      default: "",
      trim: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    detail: {
      type: String,
      required: true,
      trim: true,
    },
    kind: {
      type: String,
      enum: ["info", "warn", "success", "danger"],
      default: "info",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("AuditLog", auditLogSchema);
