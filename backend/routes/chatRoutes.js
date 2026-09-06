const express = require("express");

const { chatWithAssistant } = require("../controllers/chatController");

const router = express.Router();

// Chatboard / Trace Assistant endpoint
router.post("/", chatWithAssistant);

module.exports = router;
