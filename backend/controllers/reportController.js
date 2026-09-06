
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Report = require("../models/Report");
const MissingPerson = require("../models/MissingPerson");
const FaceMatch = require("../models/FaceMatch");
const { searchFaceMatches } = require("../services/faceMatchService");


// =====================================================
// CREATE FOUND-PERSON REPORT
// =====================================================

const createReport = async (req, res) => {
  try {
    const caseId = "FP-2026-" + Math.floor(1000 + Math.random() * 9000);

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
        const absPath = path.join(__dirname, "..", reportData.image);
        const imageBase64 = fs.readFileSync(absPath, { encoding: "base64" });

        const results = await searchFaceMatches(imageBase64, {
          topK: 5,
          threshold: 0.3
        });

        const candidates = results.flatMap((r) => r.candidates || []);

        for (const candidate of candidates) {
          const missingPerson = await MissingPerson.findOne({
            faceEngineId: candidate.id
          });

          if (!missingPerson) continue;

          await FaceMatch.create({
            report: report._id,
            missingPerson: missingPerson._id,
            faceEngineId: candidate.id,
            matchPercentage: candidate.match_percentage,
            confidenceTier: candidate.confidence_tier
          });
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

    const reports =
      await Report.find({
        status: "Verified",
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

    const report =
      await Report.findOneAndUpdate(
        query,
        req.body,
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

