
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Report = require("../models/Report");
const MissingPerson = require("../models/MissingPerson");
const FaceMatch = require("../models/FaceMatch");
const { searchFaceMatches } = require("../services/faceMatchService");
const { resolveUploadPath } = require("../middleware/upload");
const cloudStorage = require("../services/cloudStorage");

// Fields an admin may edit on a found report (stops mass-assignment of
// image / reportedBy / caseId through the update endpoint)
const EDITABLE_REPORT_FIELDS = [
  "name",
  "contact",
  "contactName",
  "location",
  "description",
  "currentAge",
  "ageWhenLost",
  "gender",
  "category",
  "marks",
  "status",
];
const { generateCaseId } = require("../utils/caseId");
const {
  isGenderConflict,
  ENGINE_TOP_K,
  MAX_MATCHES_PER_REPORT,
} = require("../utils/matchFilters");


// =====================================================
// CREATE FOUND-PERSON REPORT
// =====================================================

const createReport = async (req, res) => {
  try {
    const caseId = generateCaseId("FP");

    const reportData = {
      caseId,

      name:
        req.body.name ||
        "Unknown Person",

      contact:
        req.body.contact ||
        "",
        contactName:
      req.body.contactName ||
        "",

      location:
        req.body.location ||
        "",

      description:
        req.body.description ||
        "",

      currentAge:
        req.body.currentAge !== undefined &&
        req.body.currentAge !== ""
       ? Number(req.body.currentAge)
       : null,

      ageWhenLost:
       req.body.ageWhenLost !== undefined &&
       req.body.ageWhenLost !== ""
      ? Number(req.body.ageWhenLost)
      : null,

      gender:
        req.body.gender ||
        "other",

      category:
        req.body.category ||
        "found",

      marks:
        req.body.marks ||
        "",

      // New reports should always start as Pending
      status: "Pending",
    };


    // =================================================
    // SAVE LOGGED-IN USER
    // =================================================

    if (req.user) {
      reportData.reportedBy = req.user.id;
    }


    // =================================================
    // UPLOADED PHOTO
    // =================================================

    if (req.file) {
  reportData.image =
    `/uploads/found/${req.file.filename}`;
}


    // =================================================
    // CREATE REPORT
    // =================================================

    const report =
      await Report.create(reportData);


    // =================================================
    // AI FACE-MATCH SEARCH
    // If a photo was submitted, ask the AI face engine which missing
    // persons it resembles, and save the suggestions as FaceMatch
    // records for admin review. Never blocks/breaks report creation if
    // the engine is offline or there's no photo.
    // =================================================

    if (reportData.image) {
      try {
        const imageBase64 = await cloudStorage.readBase64(reportData.image, resolveUploadPath);

        const results = await searchFaceMatches(imageBase64, {
          topK: ENGINE_TOP_K,
          threshold: 0.3
        });

        const candidates = results.flatMap((r) => r.candidates || []);
        let kept = 0;

        for (const candidate of candidates) {
          if (kept >= MAX_MATCHES_PER_REPORT) break;

          const missingPerson = await MissingPerson.findOne({
            faceEngineId: candidate.id
          });

          if (!missingPerson) continue;

          // Never suggest a male for a female (or the other way round)
          if (isGenderConflict(report.gender, missingPerson.gender)) continue;
          kept++;

          // upsert (not create) so the same pair is never saved twice
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
            { upsert: true }
          );
        }
      } catch (engineError) {
        console.error("[createReport] face engine search skipped:", engineError.message);
      }
    }


    // =================================================
    // RETURN REPORT WITH USER INFO
    // =================================================

    const populatedReport =
      await Report.findById(report._id)
        .populate(
          "reportedBy",
          "name email"
        );


    res.status(201).json(
      populatedReport
    );

  } catch (error) {

    console.error(
      "CREATE REPORT ERROR:",
      error
    );

    res.status(500).json({
      message:
        "Failed to create report",

      error:
        error.message,
    });
  }
};


// =====================================================
// GET ALL REPORTS - ADMIN
// =====================================================

const getReports = async (req, res) => {
  try {

    const reports =
      await Report.find()
        .populate(
          "reportedBy",
          "name email"
        )
        .sort({
          createdAt: -1,
        });


    res.status(200).json(
      reports
    );

  } catch (error) {

    console.error(
      "GET REPORTS ERROR:",
      error
    );

    res.status(500).json({
      message:
        "Failed to get reports",

      error:
        error.message,
    });
  }
};


// =====================================================
// GET LOGGED-IN USER'S REPORTS
// =====================================================

const getMyReports = async (req, res) => {
  try {

    const reports =
      await Report.find({
        reportedBy:
          req.user.id,
      })
      .populate(
        "reportedBy",
        "name email"
      )
      .sort({
        createdAt: -1,
      });


    res.status(200).json(
      reports
    );

  } catch (error) {

    console.error(
      "GET MY REPORTS ERROR:",
      error
    );

    res.status(500).json({
      message:
        "Failed to get your reports",

      error:
        error.message,
    });
  }
};


// =====================================================
// PUBLIC VERIFIED REPORTS
// =====================================================

const getPublicReports = async (req, res) => {
  try {

    // Public list: no finder phone/name and no reporter email
    const reports =
      await Report.find({
        status: "Verified",
      })
      .select("-contact -contactName")
      .populate(
        "reportedBy",
        "name"
      )
      .sort({
        createdAt: -1,
      });


    res.status(200).json(
      reports
    );

  } catch (error) {

    console.error(
      "GET PUBLIC REPORTS ERROR:",
      error
    );

    res.status(500).json({
      message:
        "Failed to get public found reports",

      error:
        error.message,
    });
  }
};


// =====================================================
// ADMIN UPDATE REPORT
// =====================================================

const updateReport = async (req, res) => {
  try {
    const isObjectId = mongoose.Types.ObjectId.isValid(req.params.id);
    const query = isObjectId
      ? { $or: [{ _id: req.params.id }, { caseId: req.params.id }] }
      : { caseId: req.params.id };

    const updates = {};
    for (const field of EDITABLE_REPORT_FIELDS) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    const report =
      await Report.findOneAndUpdate(
        query,
        updates,
        {
          new: true,
          runValidators: true,
        }
      )
      .populate(
        "reportedBy",
        "name email"
      );

    if (!report) {
      return res.status(404).json({
        message:
          "Report not found",
      });
    }

    res.status(200).json(
      report
    );

  } catch (error) {
    console.error(
      "UPDATE REPORT ERROR:",
      error
    );

    res.status(500).json({
      message:
        "Failed to update report",
      error:
        error.message,
    });
  }
};


// =====================================================
// ADMIN APPROVE REPORT
// =====================================================

const approveReport = async (req, res) => {
  try {
    const isObjectId = mongoose.Types.ObjectId.isValid(req.params.id);
    const query = isObjectId
      ? { $or: [{ _id: req.params.id }, { caseId: req.params.id }] }
      : { caseId: req.params.id };

    const report =
      await Report.findOneAndUpdate(
        query,
        {
          status: "Verified",
        },
        {
          new: true,
          runValidators: true,
        }
      )
      .populate(
        "reportedBy",
        "name email"
      );

    if (!report) {
      return res.status(404).json({
        message:
          "Report not found",
      });
    }

    res.status(200).json(
      report
    );

  } catch (error) {
    console.error(
      "APPROVE REPORT ERROR:",
      error
    );

    res.status(500).json({
      message:
        "Failed to approve report",
      error:
        error.message,
    });
  }
};


// =====================================================
// ADMIN DELETE REPORT
// =====================================================

const deleteReport = async (req, res) => {
  try {
    const isObjectId = mongoose.Types.ObjectId.isValid(req.params.id);
    const query = isObjectId
      ? { $or: [{ _id: req.params.id }, { caseId: req.params.id }] }
      : { caseId: req.params.id };

    const report = await Report.findOneAndDelete(query);

    if (!report) {
      return res.status(404).json({
        message: "Report not found",
      });
    }

    // Also delete any FaceMatches associated with this report
    await FaceMatch.deleteMany({ report: report._id });

    // Remove the photo from disk so deleted reports don't leave files behind
    if (report.image && report.image.startsWith("/uploads/")) {
      cloudStorage.deleteFile(report.image).catch(() => {});
      fs.unlink(resolveUploadPath(report.image), (err) => {
        if (err && err.code !== "ENOENT") {
          console.error("[deleteReport] could not remove file:", err.message);
        }
      });
    }

    res.status(200).json({
      message: "Report deleted successfully",
    });
  } catch (error) {
    console.error("DELETE REPORT ERROR:", error);
    res.status(500).json({
      message: "Failed to delete report",
      error: error.message,
    });
  }
};


module.exports = {
  createReport,
  getReports,
  getPublicReports,
  getMyReports,
  updateReport,
  approveReport,
  deleteReport,
};

