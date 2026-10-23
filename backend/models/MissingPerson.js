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

    // Who filed the report (father, mother, guardian, police, ...)
    relationship: {
      type: String,
      trim: true,
      default: "",
    },

    // Child's B-form number (required for under-18 cases). Police/admin only.
    bForm: {
      type: String,
      trim: true,
      default: "",
    },

    // New cases stay hidden from the public until police/admin verify them
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
    verificationMethod: {
      type: String,
      enum: ["", "fir", "phone_call", "documents", "police_station", "other"],
      default: "",
    },
    verificationNote: {
      type: String,
      trim: true,
      default: "",
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    verifiedAt: {
      type: Date,
    },

    // Child cases: photo + details become public only when police turn
    // on a public alert (like an Amber Alert)
    publicAlert: {
      type: Boolean,
      default: false,
    },

    // Family's consent: show the photo publicly so people can recognise
    // the person. false = only police/admin/the reporter see it (the AI
    // still uses it for matching). Old cases default to public.
    photoPublic: {
      type: Boolean,
      default: true,
    },

    // Open cases whose photo looked very similar when this case was filed
    possibleDuplicates: [
      {
        person: { type: mongoose.Schema.Types.ObjectId, ref: "MissingPerson" },
        caseId: String,
        name: String,
        matchPercentage: Number,
      },
    ],

    // =========================
    // CASE STATUS
    // =========================

    status: {
      type: String,
      enum: ["Missing", "Found", "Closed"],
      default: "Missing",
    },

    // Set when the case is marked solved (status "Found")
    solvedAt: { type: Date },
    solvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    solvedNote: { type: String, trim: true, default: "" },

    // Case entered directly by police/admin (auto-verified)
    filedByStaff: { type: Boolean, default: false },

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