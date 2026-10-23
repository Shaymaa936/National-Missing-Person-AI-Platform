const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { verifyCnic } = require("../services/nadraService");

// "3520212345671" or "35202-1234567-1" -> "35202-1234567-1"
function formatCnic(raw) {
  const d = String(raw || "").replace(/\D/g, "");
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
}

const signup = async (req, res) => {
  try {
    // String() blocks NoSQL operator injection like {"$ne": null}
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const cnic = String(req.body.cnic || "").trim();
    const phone = String(req.body.phone || "").trim();
    const password = String(req.body.password || "");

    if (!name || !email || !cnic || !phone || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }
    // CNIC: 13 digits, dashes optional (xxxxx-xxxxxxx-x)
    if (!/^\d{5}-?\d{7}-?\d$/.test(cnic)) {
      return res.status(400).json({ message: "CNIC must be 13 digits (xxxxx-xxxxxxx-x)" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already registered"
      });
    }

    // One account per CNIC (checks both stored formats)
    const cnicFormatted = formatCnic(cnic);
    const cnicDigits = cnicFormatted.replace(/-/g, "");
    const cnicTaken = await User.findOne({ cnic: { $in: [cnicFormatted, cnicDigits] } });
    if (cnicTaken) {
      return res.status(400).json({
        message: "An account with this CNIC already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      cnic: cnicFormatted,
      phone,
      password: hashedPassword
    });

    // NADRA check in the background (doesn't slow down or block signup)
    verifyCnic({ cnic: cnicFormatted, name })
      .then(async ({ status }) => {
        if (status !== "pending") {
          await User.findByIdAndUpdate(user._id, {
            cnicStatus: status,
            cnicVerifiedAt: status === "verified" ? new Date() : undefined
          });
        }
      })
      .catch(() => {});

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(201).json({
      message: "Account created successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      message: "Signup failed"
    });
  }
};

const login = async (req, res) => {
  try {
    // String() blocks NoSQL operator injection like {"$ne": null}
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }
     if (user.status === "suspended") {
      return res.status(403).json({
        message: "Your account has been suspended. Please contact support."
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "Login failed"
    });
  }
};

// Admin: Get all registered users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({ message: "Failed to get users", error: error.message });
  }
};

// Admin: Update user role
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true } 
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Update role error:", error);
    res.status(500).json({ message: "Failed to update user role", error: error.message });
  }
};

// Admin: Suspend or reactivate user status
const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({ message: "Failed to update user status", error: error.message });
  }
};

// Admin: Mark a user's CNIC as verified / failed / pending (manual check
// until NADRA verification is connected)
const updateUserCnicStatus = async (req, res) => {
  try {
    const { cnicStatus } = req.body;
    if (!["pending", "verified", "failed"].includes(cnicStatus)) {
      return res.status(400).json({ message: "Invalid CNIC status" });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        cnicStatus,
        cnicVerifiedAt: cnicStatus === "verified" ? new Date() : null
      },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error("Update CNIC status error:", error);
    res.status(500).json({ message: "Failed to update CNIC status" });
  }
};

// Admin: Delete user
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Failed to delete user", error: error.message });
  }
};

module.exports = {
  signup,
  login,
  getAllUsers,
  updateUserRole,
  updateUserStatus,
  updateUserCnicStatus,
  deleteUser
};