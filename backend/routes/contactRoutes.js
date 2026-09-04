const express = require("express");

const {
  createContact,
  getAllContacts,
  getContactById,
  updateContactStatus,
  deleteContact,
} = require("../controllers/contactController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Public — anyone can send a contact message
router.post("/", createContact);

// Staff/Admin only
router.get("/", protect, getAllContacts);
router.get("/:id", protect, getContactById);
router.patch("/:id/status", protect, updateContactStatus);
router.delete("/:id", protect, deleteContact);

module.exports = router;