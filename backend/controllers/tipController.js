const mongoose = require("mongoose");
const Tip = require("../models/Tip");
const MissingPerson = require("../models/MissingPerson");
const { RESTRICTED_DATA_ROLES } = require("../middleware/authMiddleware");
const { notifyCaseFamily } = require("../services/notifyService");

// =====================================================
// SUBMIT TIP
// =====================================================

const submitTip = async (req, res) => {
  try {
    // String() blocks NoSQL operator injection like {"$ne": null}
    const caseId = req.body.caseId ? String(req.body.caseId).trim() : "";
    const message = req.body.message ? String(req.body.message).slice(0, 2000) : "";
    const name = req.body.name ? String(req.body.name).slice(0, 100) : "";
    const location = req.body.location ? String(req.body.location).slice(0, 200) : "";
    const contact = req.body.contact ? String(req.body.contact).trim().slice(0, 30) : "";

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
      contact,
      verified: !!req.user,
      submittedBy: req.user ? req.user.id : null,
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

// Tip text can reveal where someone was seen, so only police/admin and
// the family who filed the case get the full tips. Everyone else only
// sees that tips exist (no message, place or name).
async function canReadTipsFor(user, caseId) {
  if (!user) return false;
  if (RESTRICTED_DATA_ROLES.includes(user.role)) return true;
  const query = mongoose.Types.ObjectId.isValid(caseId)
    ? { $or: [{ _id: caseId }, { caseId }] }
    : { caseId };
  const person = await MissingPerson.findOne(query).select("reportedBy");
  return !!person?.reportedBy && String(person.reportedBy) === String(user.id);
}

const getCaseTips = async (req, res) => {
  try {
    const { caseId } = req.params;
    const fullAccess = await canReadTipsFor(req.user, caseId);

    let tips = [];

    // If ObjectId, search both references
    if (mongoose.Types.ObjectId.isValid(caseId)) {
      tips = await Tip.find({
        $or: [
          { caseId: caseId },
          { caseTrackingId: caseId },
        ],
        status: "approved",
      }).select("-contact -submittedBy").sort({ createdAt: -1 });
    } else {
      tips = await Tip.find({
        caseTrackingId: caseId,
        status: "approved",
      }).select("-contact -submittedBy").sort({ createdAt: -1 });
    }

    if (!fullAccess) {
      tips = tips.map((t) => ({
        _id: t._id,
        status: t.status,
        createdAt: t.createdAt,
        name: "Anonymous",
        message: "",
        location: "",
        hidden: true,
      }));
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

    // NGO partners don't see the tipster's phone number
    const canSeeContact = RESTRICTED_DATA_ROLES.includes(req.user?.role);
    const safeTips = tips.map((t) => {
      const obj = t.toObject ? t.toObject() : t;
      if (!canSeeContact) delete obj.contact;
      return obj;
    });

    res.status(200).json(safeTips);
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

    if (normalizedStatus === "approved" && tip.caseId) {
      notifyCaseFamily(tip.caseId._id || tip.caseId, "New verified tip on your case", [
        "Someone has shared information about this case and our team has reviewed it.",
        "The police / TraceAI team will follow it up and contact you if needed.",
        "آپ کے کیس پر نئی اطلاع موصول ہوئی ہے جس کا جائزہ لے لیا گیا ہے۔",
      ]).catch(() => {});
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