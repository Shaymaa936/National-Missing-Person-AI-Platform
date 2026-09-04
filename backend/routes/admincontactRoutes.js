const express = require("express");
const router = express.Router();
const {
  createAdminContact,
  getAdminContacts,
  markAdminContactAsRead,
  deleteAdminContact,
} = require("../controllers/AdmincontactController");

router.post("/", createAdminContact);             // public - from Contact Us form (POST /api/v1/contact)
router.get("/", getAdminContacts);                 // admin - list all messages (GET /api/v1/contact)
router.patch("/:id/read", markAdminContactAsRead); // admin - mark as read
router.delete("/:id", deleteAdminContact);         // admin - delete

module.exports = router;