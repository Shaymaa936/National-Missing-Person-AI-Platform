const mongoose = require("mongoose");


const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FaceMatch = require("../models/FaceMatch");
const MissingPerson = require("../models/MissingPerson");
const Report = require("../models/Report");
const { resolveUploadPath } = require("../middleware/upload");
const cloudStorage = require("../services/cloudStorage");
const { notifyCaseFamily } = require("../services/notifyService");
const { RESTRICTED_DATA_ROLES } = require("../middleware/authMiddleware");
const {
  isGenderConflict,
  ENGINE_TOP_K,
  MAX_MATCHES_PER_REPORT,
} = require("../utils/matchFilters");

// Removes old Pending suggestions that pair a male with a female.
// (Confirmed / Rejected ones are the admin's decision and are kept.)
async function removeGenderMismatches(report) {
  const pending = await FaceMatch.find({ report: report._id, status: "Pending" })
    .populate("missingPerson", "gender");
  const bad = pending.filter(
    (m) => m.missingPerson && isGenderConflict(report.gender, m.missingPerson.gender)
  );
  if (bad.length) {
    await FaceMatch.deleteMany({ _id: { $in: bad.map((m) => m._id) } });
  }
  return bad.length;
}

// Hide CNIC / family contacts / FIR inside populated matches for staff roles
// that are not allowed to see restricted data (e.g. reporter, tipster)
function stripRestricted(match, role) {
  const obj = match.toObject ? match.toObject() : match;
  if (!RESTRICTED_DATA_ROLES.includes(role) && obj.missingPerson && typeof obj.missingPerson === "object") {
    delete obj.missingPerson.cnic;
    delete obj.missingPerson.contactName;
    delete obj.missingPerson.contactPhone;
    delete obj.missingPerson.contactEmail;
    delete obj.missingPerson.fir;
    obj.missingPerson.firImage = null;
  }
  return obj;
}
const {
  registerMissingFace,
  searchFaceMatches,
  updateFaceEngineStatus,
  listFaceEngineCaseIds,
  checkEngineHealth
} = require("../services/faceMatchService");

// Helper to extract base64 from local file path or remote URL
async function getImageBase64(imagePath) {
  if (!imagePath) return null;
  if (imagePath.startsWith("data:image")) {
    return imagePath.split(",")[1];
  }
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    try {
      const response = await axios.get(imagePath, {
        responseType: "arraybuffer",
        timeout: 8000
      });
      return Buffer.from(response.data, "binary").toString("base64");
    } catch (err) {
      console.error(`[getImageBase64] Failed to fetch remote URL: ${imagePath}`, err.message);
      return null;
    }
  }
  const cleanPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  // local file, or the Cloudinary copy when this machine doesn't have it
  try {
    return await cloudStorage.readBase64(cleanPath, resolveUploadPath);
  } catch (err) {
    return null;
  }
}

// Sync all missing persons from MongoDB to the Python face engine if not enrolled yet
async function syncMissingPersonsToFaceEngine() {
  const missingPersons = await MissingPerson.find({
    image: { $exists: true, $ne: "" },
    status: { $ne: "Found" }
  });

  // Cases enrolled on another machine (e.g. your laptop before moving to
  // the VPS) have a faceEngineId this engine has never seen. Treat those as
  // not enrolled so they get registered again here.
  const engineIds = await listFaceEngineCaseIds();

  for (const mp of missingPersons) {
    const knownToEngine =
      !!mp.faceEngineId && (engineIds === null || engineIds.has(mp.faceEngineId));
    if (!knownToEngine) {
      try {
        const imageBase64 = await getImageBase64(mp.image);
        if (imageBase64) {
          const faceEngineId = await registerMissingFace({
            name: mp.name,
            age: mp.age,
            gender: mp.gender,
            missingSince: mp.lastSeenDate ? new Date(mp.lastSeenDate).toISOString().slice(0, 10) : "Recently",
            lastSeenLocation: mp.lastSeenLocation || "Unknown",
            contactNumber: "N/A",
            notes: mp.description || "",
            imageBase64
          });
          if (faceEngineId) {
            mp.faceEngineId = faceEngineId;
            await mp.save();
          }
        }
      } catch (err) {
        console.error(`[syncMissingPersons] Failed for ${mp.name}:`, err.message);
      }
    }
  }
}

// GET /api/matches
// Lists all AI-suggested matches for the admin "AI Face-Match Review" panel.
const getMatches = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status; // Pending | Confirmed | Rejected

    const matches = await FaceMatch.find(filter)
      .populate("report")
      .populate("missingPerson")
      .sort({ createdAt: -1 });

    res.status(200).json(matches.map((m) => stripRestricted(m, req.user.role)));
  } catch (error) {
    res.status(500).json({
      message: "Failed to get face matches",
      error: error.message
    });
  }
};

// PUT /api/matches/:id
// Body: { status: "Confirmed" | "Rejected" }
// Admin reviews a suggested match. Confirming marks the linked missing
// person case as Found and syncs status back to the face engine.
const updateMatch = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["Confirmed", "Rejected"].includes(status)) {
      return res.status(400).json({
        message: "status must be 'Confirmed' or 'Rejected'"
      });
    }

    const match = await FaceMatch.findByIdAndUpdate(
      req.params.id,
      {
        status,
        reviewedBy: req.user.id,
        reviewedAt: new Date()
      },
      { new: true }
    ).populate("missingPerson");

    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    if (status === "Confirmed" && match.missingPerson) {
      // Mark as Found and record it on the case timeline
      await MissingPerson.findByIdAndUpdate(match.missingPerson._id, {
        status: "Found",
        solvedAt: new Date(),
        solvedBy: req.user?.id,
        solvedNote: `AI match confirmed (${match.matchPercentage}%)`,
        $push: {
          timeline: {
            title: "AI match confirmed",
            desc: `Face match (${match.matchPercentage}%) confirmed by admin review.`,
            date: new Date()
          }
        }
      });

      if (match.faceEngineId) {
        await updateFaceEngineStatus(match.faceEngineId, "Found");
      }

      // Tell the family (doesn't wait / never breaks the request)
      notifyCaseFamily(match.missingPerson._id, "Possible match confirmed", [
        "A found-person report has been matched to this case and confirmed by our review team.",
        "The police / TraceAI team will contact you with next steps. Please keep your phone on.",
        "ایک ملنے والے شخص کی رپورٹ آپ کے کیس سے میچ ہوئی ہے۔ ٹیم جلد آپ سے رابطہ کرے گی۔",
      ]).catch(() => {});
    }

    res.status(200).json(match);
  } catch (error) {
    res.status(500).json({
      message: "Failed to update face match",
      error: error.message
    });
  }
};

// POST /api/matches/run/:reportId
// Explicitly runs AI face matching for a specific found-person report against missing persons
const runFaceMatchForReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const report = mongoose.Types.ObjectId.isValid(reportId)
  ? await Report.findById(reportId)
  : await Report.findOne({ caseId: reportId });
    if (!report) {
      return res.status(404).json({ message: "Found person report not found" });
    }

    if (!report.image) {
      return res.status(400).json({ message: "This report has no photo to match against." });
    }

    const health = await checkEngineHealth();
    if (health.status === "offline") {
      return res.status(503).json({
        message: "AI Face Engine is offline. Please make sure the Python server (face_dtc) is running on port 8000."
      });
    }

    // 1. Sync any missing persons in Mongo to the Python engine
    await syncMissingPersonsToFaceEngine();

    // 2. Load report photo base64
    const imageBase64 = await getImageBase64(report.image);
    if (!imageBase64) {
      return res.status(400).json({ message: "Could not read report photo." });
    }

    // 3. Search missing candidates in Python face engine
    const results = await searchFaceMatches(imageBase64, {
      topK: ENGINE_TOP_K,
      threshold: 0.25
    });

    await removeGenderMismatches(report);

    const candidates = results.flatMap((r) => r.candidates || []);
    const createdMatches = [];

    for (const candidate of candidates) {
      if (createdMatches.length >= MAX_MATCHES_PER_REPORT) break;

      const missingPerson = await MissingPerson.findOne({
        faceEngineId: candidate.id
      });

      if (!missingPerson) continue;

      // Never suggest a male for a female (or the other way round)
      if (isGenderConflict(report.gender, missingPerson.gender)) continue;

      // $setOnInsert: a re-scan no longer resets Confirmed/Rejected back to Pending
      const match = await FaceMatch.findOneAndUpdate(
        { report: report._id, missingPerson: missingPerson._id },
        {
          $set: {
            faceEngineId: candidate.id,
            matchPercentage: candidate.match_percentage,
            confidenceTier: candidate.confidence_tier
          },
          $setOnInsert: { status: "Pending" }
        },
        { upsert: true, new: true }
      ).populate("report").populate("missingPerson");

      createdMatches.push(match);
    }

    res.status(200).json({
      success: true,
      message: createdMatches.length > 0
        ? `Found ${createdMatches.length} candidate match(es)!`
        : "AI Scan completed. No matching missing persons found above confidence threshold.",
      matchesCount: createdMatches.length,
      matches: createdMatches
    });
  } catch (error) {
    console.error("RUN FACE MATCH ERROR:", error);
    res.status(500).json({
      message: "Failed to run face match",
      error: error.message
    });
  }
};

// POST /api/matches/run-all
// Scans all pending found reports against all missing persons
const runAllFaceMatches = async (req, res) => {
  try {
    const health = await checkEngineHealth();
    if (health.status === "offline") {
      return res.status(503).json({
        message: "AI Face Engine is offline. Please make sure the Python server (face_dtc) is running on port 8000."
      });
    }

    await syncMissingPersonsToFaceEngine();

    const reports = await Report.find({ image: { $exists: true, $ne: "" } });
    let totalMatches = 0;

    for (const report of reports) {
      try {
        const imageBase64 = await getImageBase64(report.image);
        if (!imageBase64) continue;

        const results = await searchFaceMatches(imageBase64, { topK: ENGINE_TOP_K, threshold: 0.25 });
        const candidates = results.flatMap((r) => r.candidates || []);

        await removeGenderMismatches(report);
        let kept = 0;

        for (const candidate of candidates) {
          if (kept >= MAX_MATCHES_PER_REPORT) break;

          const missingPerson = await MissingPerson.findOne({ faceEngineId: candidate.id });
          if (!missingPerson) continue;

          // Never suggest a male for a female (or the other way round)
          if (isGenderConflict(report.gender, missingPerson.gender)) continue;
          kept++;

          await FaceMatch.findOneAndUpdate(
            { report: report._id, missingPerson: missingPerson._id },
            {
              $set: {
                faceEngineId: candidate.id,
                matchPercentage: candidate.match_percentage,
                confidenceTier: candidate.confidence_tier
              },
              $setOnInsert: { status: "Pending" }
            },
            { upsert: true, new: true }
          );
          totalMatches++;
        }
      } catch (err) {
        console.error(`[runAllFaceMatches] Error for report ${report._id}:`, err.message);
      }
    }

    res.status(200).json({
      success: true,
      message: `Scanned all reports. Generated ${totalMatches} total match candidates.`,
      totalMatches
    });
  } catch (error) {
    console.error("RUN ALL FACE MATCHES ERROR:", error);
    res.status(500).json({
      message: "Failed to run all face matches",
      error: error.message
    });
  }
};

// GET /api/matches/engine-health
// Lets the admin dashboard show whether the AI engine is reachable.
const getEngineHealth = async (req, res) => {
  const health = await checkEngineHealth();
  res.status(200).json(health);
};

module.exports = {
  getMatches,
  updateMatch,
  runFaceMatchForReport,
  runAllFaceMatches,
  getEngineHealth
};
