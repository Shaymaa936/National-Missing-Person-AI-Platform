const mongoose = require("mongoose");

// Stores one AI-suggested candidate match between a Found Report and a
// Missing Person case, so the admin can review/confirm/reject it instead
// of trusting the AI blindly.
const faceMatchSchema = new mongoose.Schema(
  {
    report: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Report",
      required: true
    },

    missingPerson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MissingPerson",
      required: true
    },

    // The face engine's own case id (e.g. "MP-XXXXXXXX"), kept so we can
    // call back into the Python service (e.g. to sync status) without an
    // extra lookup.
    faceEngineId: {
      type: String
    },

    matchPercentage: {
      type: Number,
      required: true
    },

    confidenceTier: {
      type: String, // "High Match" | "Possible Match" | "Low Match" (from the engine)
    },

    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Rejected"],
      default: "Pending"
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    reviewedAt: {
      type: Date
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("FaceMatch", faceMatchSchema);
