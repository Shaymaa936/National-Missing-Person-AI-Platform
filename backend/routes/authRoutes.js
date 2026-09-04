const express = require("express");
const {
  signup,
  login,
  getAllUsers,
  updateUserRole,
  updateUserStatus,
  deleteUser
} = require("../controllers/authController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);

// Admin: User & Role management
router.get("/users", protect, adminOnly, getAllUsers);
router.put("/users/:id/role", protect, adminOnly, updateUserRole);
router.put("/users/:id/status", protect, adminOnly, updateUserStatus);
router.delete("/users/:id", protect, adminOnly, deleteUser);

module.exports = router;
