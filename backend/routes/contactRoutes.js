const express = require("express");

const {
  createContact,
  getAllContacts,
  getContactById,
  updateContactStatus,
  deleteContact,
} = require("../controllers/contactController");

const { protect, staffViewOnly } = require("../middleware/authMiddleware");
const verifyTurnstile = require("../middleware/verifyTurnstile");

const router = express.Router();

// Public — anyone can send a contact message
router.post("/", verifyTurnstile, createContact);

// Staff/Admin only
// (staffViewOnly added: before, ANY signed-up user could read/delete all messages)
router.get("/", protect, staffViewOnly, getAllContacts);
router.get("/:id", protect, staffViewOnly, getContactById);
router.patch("/:id/status", protect, staffViewOnly, updateContactStatus);
router.delete("/:id", protect, staffViewOnly, deleteContact);

module.exports = router;