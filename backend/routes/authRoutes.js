const express = require("express");
const {
  signup,
  login,
  getAllUsers,
  updateUserRole,
  updateUserStatus,
  updateUserCnicStatus,
  deleteUser
} = require("../controllers/authController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const verifyTurnstile = require("../middleware/verifyTurnstile");

const router = express.Router();

router.post("/signup", verifyTurnstile, signup);
router.post("/login", login);

// Admin: User & Role management
router.get("/users", protect, adminOnly, getAllUsers);
router.put("/users/:id/role", protect, adminOnly, updateUserRole);
router.put("/users/:id/status", protect, adminOnly, updateUserStatus);
router.put("/users/:id/cnic-status", protect, adminOnly, updateUserCnicStatus);
router.delete("/users/:id", protect, adminOnly, deleteUser);

module.exports = router;
