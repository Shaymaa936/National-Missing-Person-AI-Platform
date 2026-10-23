const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    // Required at signup; stored as xxxxx-xxxxxxx-x; one account per CNIC
    cnic: {
      type: String,
      required: true,
      trim: true
    },

    // NADRA verification: "pending" until verified (automatically via
    // services/nadraService.js once NADRA access is set up, or by an admin)
    cnicStatus: {
      type: String,
      enum: ["pending", "verified", "failed"],
      default: "pending"
    },

    cnicVerifiedAt: {
      type: Date
    },
   phone: {
      type: String,
      required: true,
      trim: true
   },

    password: {
      type: String,
      required: true
    },

    role: {
      type: String,
      // 4 roles: admin (team), police (authorities), ngo (partners), user (public)
      enum: ["admin", "police", "ngo", "user"],
      default: "user"
    },

    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);