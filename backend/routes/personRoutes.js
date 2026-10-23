const { upload } = require("../middleware/upload");
const stripImageMetadata = require("../middleware/stripImageMetadata");
const dailyReportLimit = require("../middleware/dailyReportLimit");
const express = require("express");

const {
  createPerson,
  getPersons,
  getPersonById,
  getMyPersons,
  updatePerson,
  deletePerson,
  verifyPerson,
  setPublicAlert,
  addFir,
  solvePerson,
  ownerEditPerson,
} = require("../controllers/personController");

const { protect, adminOnly, reviewerOnly } = require("../middleware/authMiddleware");

const router = express.Router();

const optionalAuth = require("../middleware/optionalAuth");
router.get("/", optionalAuth, getPersons);
router.get("/my-reports", protect, getMyPersons);
router.get("/:id", optionalAuth, getPersonById);

// dailyReportLimit: max 3 reports per account per 24h (runs before upload)
router.post( "/",protect, dailyReportLimit, upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "firFile", maxCount: 1 }
  ]),
  stripImageMetadata, // removes GPS/EXIF, rejects non-images
  createPerson
);

// police can update case status too (the dashboard already shows them this)
router.put("/:id", protect, reviewerOnly, updatePerson);
router.delete("/:id", protect, adminOnly, deletePerson);

// Verification (police/admin), child public alert (police/admin), FIR later (family)
router.put("/:id/verify", protect, reviewerOnly, verifyPerson);
router.put("/:id/public-alert", protect, reviewerOnly, setPublicAlert);
router.put("/:id/fir", protect, addFir);

// Mark solved / reopen (police/admin)
router.put("/:id/solve", protect, reviewerOnly, solvePerson);

// Family edits their own case (optional new photo)
router.put("/:id/edit", protect, upload.fields([{ name: "photo", maxCount: 1 }]), stripImageMetadata, ownerEditPerson);

module.exports = router;