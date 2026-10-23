const mongoose = require("mongoose");

const tipSchema = new mongoose.Schema(
  {
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MissingPerson",
      default: null,
    },

    caseTrackingId: {
      type: String,
      trim: true,
      required: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    name: {
      type: String,
      default: "Anonymous",
      trim: true,
    },

    location: {
      type: String,
      default: "—",
      trim: true,
    },

    // Optional phone so police can call back. Visible to police/admin only.
    contact: {
      type: String,
      default: "",
      trim: true,
    },

    // Sent by a logged-in account (CNIC on file) -> more trustworthy
    verified: {
      type: Boolean,
      default: false,
    },

    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Tip", tipSchema);