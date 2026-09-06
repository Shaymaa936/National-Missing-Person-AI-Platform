const mongoose = require("mongoose");

const missingPersonSchema = new mongoose.Schema(
  {
    // =========================
    // CASE INFORMATION
    // =========================

    caseId: {
      type: String,
      unique: true,
      sparse: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    age: {
      type: Number,
    },

    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
    },

    lastSeenLocation: {
      type: String,
      trim: true,
    },

    lastSeenDate: {
      type: Date,
    },

    description: {
      type: String,
      trim: true,
    },
    cnic: {
  type: String,
  default: "",
  trim: true,
},

contactName: {
  type: String,
  default: "",
  trim: true,
},

contactPhone: {
  type: String,
  default: "",
  trim: true,
},

contactEmail: {
  type: String,
  default: "",
  trim: true,
},

fir: {
  type: String,
  default: "",
  trim: true,
},

    // =========================
    // RESTRICTED INFORMATION
    // =========================

    cnic: {
      type: String,
      trim: true,
      default: "",
    },
    contactName: {
  type: String,
  trim: true,
  default: "",
},


    contactPhone: {
      type: String,
      trim: true,
      default: "",
    },

    contactEmail: {
      type: String,
      trim: true,
      default: "",
    },

    fir: {
      type: String,
      trim: true,
      default: "",
    },

    // =========================
    // CASE TIMELINE
    // =========================

    timeline: [
      {
        title: {
          type: String,
          trim: true,
        },

        desc: {
          type: String,
          trim: true,
        },

        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // =========================
    // IMAGES / FILES
    // =========================

    image: {
      type: String,
      default: "",
    },

    firImage: {
      type: String,
      default: "",
    },

    // =========================
    // CASE STATUS
    // =========================

    status: {
      type: String,
      enum: ["Missing", "Found", "Closed"],
      default: "Missing",
    },

    // =========================
    // REPORTER
    // =========================

    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // =========================
    // AI FACE ENGINE
    // =========================

    faceEngineId: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("MissingPerson", missingPersonSchema);