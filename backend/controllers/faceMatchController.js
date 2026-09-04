const mongoose = require("mongoose");


const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FaceMatch = require("../models/FaceMatch");
const MissingPerson = require("../models/MissingPerson");
const Report = require("../models/Report");
const {
  registerMissingFace,
  searchFaceMatches,
  updateFaceEngineStatus,
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
  const absPath = path.join(__dirname, "..", cleanPath);
  if (fs.existsSync(absPath)) {
    return fs.readFileSync(absPath, { encoding: "base64" });
  }
  return null;
}

// Sync all missing persons from MongoDB to the Python face engine if not enrolled yet
async function syncMissingPersonsToFaceEngine() {
  const missingPersons = await MissingPerson.find({
    image: { $exists: true, $ne: "" },
    status: { $ne: "Found" }
  });

  for (const mp of missingPersons) {
    if (!mp.faceEngineId) {
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

    res.status(200).json(matches);
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
      await MissingPerson.findByIdAndUpdate(match.missingPerson._id, {
        status: "Found"
      });

      if (match.faceEngineId) {
        await updateFaceEngineStatus(match.faceEngineId, "Found");
      }
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
      topK: 5,
      threshold: 0.25
    });

    const candidates = results.flatMap((r) => r.candidates || []);
    const createdMatches = [];

    for (const candidate of candidates) {
      const missingPerson = await MissingPerson.findOne({
        faceEngineId: candidate.id
      });

      if (!missingPerson) continue;

      const match = await FaceMatch.findOneAndUpdate(
        { report: report._id, missingPerson: missingPerson._id },
        {
          report: report._id,
          missingPerson: missingPerson._id,
          faceEngineId: candidate.id,
          matchPercentage: candidate.match_percentage,
          confidenceTier: candidate.confidence_tier,
          status: "Pending"
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

        const results = await searchFaceMatches(imageBase64, { topK: 5, threshold: 0.25 });
        const candidates = results.flatMap((r) => r.candidates || []);

        for (const candidate of candidates) {
          const missingPerson = await MissingPerson.findOne({ faceEngineId: candidate.id });
          if (!missingPerson) continue;

          await FaceMatch.findOneAndUpdate(
            { report: report._id, missingPerson: missingPerson._id },
            {
              report: report._id,
              missingPerson: missingPerson._id,
              faceEngineId: candidate.id,
              matchPercentage: candidate.match_percentage,
              confidenceTier: candidate.confidence_tier,
              status: "Pending"
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
