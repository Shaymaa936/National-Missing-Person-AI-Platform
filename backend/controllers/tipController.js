const mongoose = require("mongoose");
const Tip = require("../models/Tip");
const MissingPerson = require("../models/MissingPerson");

// =====================================================
// SUBMIT TIP
// =====================================================

const submitTip = async (req, res) => {
  try {
    const { caseId, message, name, location } = req.body;

    if (!caseId || !message?.trim()) {
      return res.status(400).json({
        message: "Case ID and tip message are required",
      });
    }

    let linkedCase = null;

    // MongoDB _id
    if (mongoose.Types.ObjectId.isValid(caseId)) {
      linkedCase = await MissingPerson.findById(caseId);
    }

    // Public tracking ID e.g. MP-2026-1234
    if (!linkedCase) {
      linkedCase = await MissingPerson.findOne({
        caseId: caseId,
      });
    }

    if (!linkedCase) {
      return res.status(404).json({
        message: "Missing person case not found",
      });
    }

    const tip = await Tip.create({
      caseId: linkedCase._id,
      caseTrackingId: linkedCase.caseId,
      message: message.trim(),
      name: name?.trim() || "Anonymous",
      location: location?.trim() || "—",
      status: "pending",
    });

    res.status(201).json({
      message: "Tip submitted successfully",
      tip,
    });
  } catch (error) {
    console.error("Submit tip error:", error);

    res.status(500).json({
      message: "Failed to submit tip",
      error: error.message,
    });
  }
};


// =====================================================
// GET TIPS FOR ONE CASE
// Public endpoint
// =====================================================

const getCaseTips = async (req, res) => {
  try {
    const { caseId } = req.params;

    let tips = [];

    // If ObjectId, search both references
    if (mongoose.Types.ObjectId.isValid(caseId)) {
      tips = await Tip.find({
        $or: [
          { caseId: caseId },
          { caseTrackingId: caseId },
        ],
        status: "approved",
      }).sort({ createdAt: -1 });
    } else {
      tips = await Tip.find({
        caseTrackingId: caseId,
        status: "approved",
      }).sort({ createdAt: -1 });
    }

    res.status(200).json(tips);
  } catch (error) {
    console.error("Get case tips error:", error);

    res.status(500).json({
      message: "Failed to fetch tips",
      error: error.message,
    });
  }
};


// =====================================================
// ADMIN: GET ALL TIPS
// =====================================================

const getAllTips = async (req, res) => {
  try {
    const tips = await Tip.find()
      .populate(
        "caseId",
        "name caseId lastSeenLocation image status"
      )
      .sort({ createdAt: -1 });

    res.status(200).json(tips);
  } catch (error) {
    console.error("Get all tips error:", error);

    res.status(500).json({
      message: "Failed to get tips",
      error: error.message,
    });
  }
};


// =====================================================
// ADMIN: APPROVE / REJECT TIP
// =====================================================

const updateTipStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const normalizedStatus = status?.toLowerCase();

    if (!["pending", "approved", "rejected"].includes(normalizedStatus)) {
      return res.status(400).json({
        message: "Invalid tip status",
      });
    }

    const tip = await Tip.findByIdAndUpdate(
      req.params.id,
      {
        status: normalizedStatus,
      },
      {
        new: true,
        runValidators: true,
      }
    ).populate(
      "caseId",
      "name caseId lastSeenLocation image status"
    );

    if (!tip) {
      return res.status(404).json({
        message: "Tip not found",
      });
    }

    res.status(200).json(tip);
  } catch (error) {
    console.error("Update tip status error:", error);

    res.status(500).json({
      message: "Failed to update tip status",
      error: error.message,
    });
  }
};


// =====================================================
// ADMIN: DELETE TIP
// =====================================================

const deleteTip = async (req, res) => {
  try {
    const tip = await Tip.findByIdAndDelete(req.params.id);

    if (!tip) {
      return res.status(404).json({
        message: "Tip not found",
      });
    }

    res.status(200).json({
      message: "Tip deleted successfully",
    });
  } catch (error) {
    console.error("Delete tip error:", error);

    res.status(500).json({
      message: "Failed to delete tip",
      error: error.message,
    });
  }
};


module.exports = {
  submitTip,
  getCaseTips,
  getAllTips,
  updateTipStatus,
  deleteTip,
};