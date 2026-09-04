
const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    caseId: {
      type: String,
      unique: true,
      sparse: true,
    },

    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    contact: {
      type: String,
      required: true,
      trim: true,
    },
     contactName: {
     type: String,
     default: "",
      trim: true,
    },

    location: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

     currentAge: {
     type: Number,
    default: null,
    },

   ageWhenLost: {
  type: Number,
  default: null,
    },

    gender: {
      type: String,
      default: "other",
    },

    category: {
      type: String,
      default: "found",
    },

    marks: {
      type: String,
      default: "",
    },

    image: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["Pending", "Verified", "Rejected"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Report", reportSchema);
