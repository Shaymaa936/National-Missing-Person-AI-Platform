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