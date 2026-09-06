const { upload } = require("../middleware/upload");
const express = require("express");

const {
  createPerson,
  getPersons,
  getPersonById,
  getMyPersons,
  updatePerson,
  deletePerson
} = require("../controllers/personController");

const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

const optionalAuth = require("../middleware/optionalAuth");
router.get("/", optionalAuth, getPersons);
router.get("/my-reports", protect, getMyPersons);
router.get("/:id", optionalAuth, getPersonById);

router.post( "/",protect, upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "firFile", maxCount: 1 }
  ]),
  createPerson
);

router.put("/:id", protect, adminOnly, updatePerson);
router.delete("/:id", protect, adminOnly, deletePerson);

module.exports = router;