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
    cnic: {
      type: String,
      required: true,
      trim: true
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
      enum: ["admin", "investigator", "police", "dpo", "reporter", "tipster", "ngo", "user"],
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