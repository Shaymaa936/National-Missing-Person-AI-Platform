const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const MissingPerson = require("../models/MissingPerson");
const Tip = require("../models/Tip");
const FaceMatch = require("../models/FaceMatch");

const {
  registerMissingFace,
  deleteFaceEngineCase,
  searchFaceMatches,
  updateFaceEngineStatus,
} = require("../services/faceMatchService");
const { notifyCaseFamily } = require("../services/notifyService");
const { isGenderConflict } = require("../utils/matchFilters");

// Similarity (0-1) above which a new case is flagged as a possible duplicate
const DUPLICATE_THRESHOLD = Number(process.env.DUPLICATE_THRESHOLD || 0.7);

const { resolveUploadPath } = require("../middleware/upload");
const cloudStorage = require("../services/cloudStorage");
const { generateCaseId } = require("../utils/caseId");
const { RESTRICTED_DATA_ROLES, STAFF_ROLES: DASHBOARD_ROLES } = require("../middleware/authMiddleware");
const { isMinor, toPublicView } = require("../utils/casePrivacy");
const AuditLog = require("../models/AuditLog");
const User = require("../models/User");

const RELATIONSHIP_MAX = 50;
const VERIFY_METHODS = ["fir", "phone_call", "documents", "police_station", "other"];
const VERIFY_METHOD_LABELS = {
  fir: "FIR checked",
  phone_call: "phone call with the family",
  documents: "documents checked",
  police_station: "confirmed with police station",
  other: "other",
};

// "35202-1234567-1" style, 13 digits; returns "" if invalid
function formatId13(raw) {
  const d = String(raw || "").replace(/\D/g, "");
  if (d.length !== 13) return "";
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
}

// Is the user the family/account that filed this case?
function isOwner(user, person) {
  if (!user) return false;
  const ownerId = person.reportedBy?._id || person.reportedBy;
  return !!ownerId && String(ownerId) === String(user.id);
}

async function writeAudit(req, action, detail, kind = "info") {
  try {
    const me = await User.findById(req.user.id).select("name role");
    const raw = me?.name || "Staff";
    await AuditLog.create({
      actor: raw.charAt(0).toUpperCase() + raw.slice(1),
      actorId: req.user.id,
      actorRole: me?.role || req.user.role || "",
      action,
      detail,
      kind,
    });
  } catch (err) {
    console.error("[audit]", err.message);
  }
}

// Finds a case by Mongo _id or public caseId
function caseQuery(id) {
  return mongoose.Types.ObjectId.isValid(id)
    ? { $or: [{ _id: id }, { caseId: id }] }
    : { caseId: id };
}

// Roles allowed to see restricted case info (CNIC, family contact, FIR): admin, police
const STAFF_ROLES = RESTRICTED_DATA_ROLES;

// Restricted info is only for staff or the user who filed the report
function canSeeRestricted(user, person) {
  if (!user) return false;
  if (STAFF_ROLES.includes(user.role)) return true;

  const ownerId = person.reportedBy?._id || person.reportedBy;
  return !!ownerId && String(ownerId) === String(user.id);
}

// Deletes an uploaded file from disk (ignores files that are already gone)
function removeUploadedFile(publicPath) {
  if (!publicPath || !publicPath.startsWith("/uploads/")) return;

  cloudStorage.deleteFile(publicPath).catch(() => {});

  fs.unlink(resolveUploadPath(publicPath), (err) => {
    if (err && err.code !== "ENOENT") {
      console.error("[deletePerson] could not remove file:", err.message);
    }
  });
}


// Case solved = status "Found". Records who/when + a timeline entry and
// tells the face engine to stop matching it.
function applySolved(person, req, note = "") {
  person.status = "Found";
  person.solvedAt = new Date();
  person.solvedBy = req.user.id;
  person.solvedNote = String(note || "").trim().slice(0, 300);
  person.timeline.push({
    title: "Case solved",
    desc: "The person has been found. Case closed as solved.",
    date: new Date(),
  });
  if (person.faceEngineId) updateFaceEngineStatus(person.faceEngineId, "Found").catch(() => {});
}

function applyReopened(person) {
  person.status = "Missing";
  person.solvedAt = undefined;
  person.solvedBy = undefined;
  person.solvedNote = "";
  person.timeline.push({
    title: "Case reopened",
    desc: "The case was reopened by the TraceAI team / police.",
    date: new Date(),
  });
  if (person.faceEngineId) updateFaceEngineStatus(person.faceEngineId, "Missing").catch(() => {});
}


/* =====================================================
   CREATE MISSING PERSON
===================================================== */

const createPerson = async (req, res) => {
  try {
    const imagePath = req.files?.photo
      ? `/uploads/missing/${req.files.photo[0].filename}`
      : "";

    const firImagePath = req.files?.firFile
      ? `/uploads/fir/${req.files.firFile[0].filename}`
      : "";

    // ---- validation: relationship always, B-form for children ----
    const relationship = String(req.body.relationship || "").trim().slice(0, RELATIONSHIP_MAX);
    const ageNum = req.body.age ? Number(req.body.age) : NaN;
    const childCase = isMinor({ age: ageNum });
    const bForm = formatId13(req.body.bForm);

    const rejectInput = (message) => {
      removeUploadedFile(imagePath);
      removeUploadedFile(firImagePath);
      return res.status(400).json({ message });
    };

    // Police/admin entering a case themselves: they ARE the verifier
    const staffFiled = RESTRICTED_DATA_ROLES.includes(req.user?.role);

    if (!relationship) {
      return rejectInput("Please select your relationship to the missing person.");
    }
    if (childCase && !bForm) {
      return rejectInput("For a child (under 18) please enter the 13-digit B-form number.");
    }

    const caseId = generateCaseId("MP");

    const person = await MissingPerson.create({
      caseId,

      relationship,
      bForm: childCase ? bForm : "",
      // hidden from the public until police/admin verify it
      // (cases entered by police/admin are verified straight away)
      verificationStatus: staffFiled ? "verified" : "pending",
      verificationMethod: staffFiled ? "police_station" : "",
      verificationNote: staffFiled ? "Entered by police / TraceAI team" : "",
      verifiedBy: staffFiled ? req.user.id : undefined,
      verifiedAt: staffFiled ? new Date() : undefined,
      filedByStaff: staffFiled,

      /* =========================
         BASIC INFORMATION
      ========================= */

      name:
        req.body.name ||
        "Unknown Person",

      age:
        req.body.age
          ? Number(req.body.age)
          : undefined,

       gender:
  req.body.gender
    ? req.body.gender.charAt(0).toUpperCase() +
      req.body.gender.slice(1).toLowerCase()
    : "Other",

      lastSeenLocation:
        req.body.lastSeenLocation ||
        "",

      lastSeenDate:
        req.body.lastSeenDate ||
        null,

      description:
        req.body.description ||
        "",


      /* =========================
         RESTRICTED INFORMATION
      ========================= */

      cnic:
        req.body.cnic ||
        "",

      contactName:
        req.body.contactName ||
        "",

      contactPhone:
        req.body.contactPhone ||
        req.body.phone ||
        req.body.contactNumber ||
        "",

      contactEmail:
        req.body.contactEmail ||
        req.body.email ||
        "",

      fir:
        req.body.fir ||
        req.body.firNo ||
        req.body.firNumber ||
        "",


      /* =========================
         FILES
      ========================= */

      image: imagePath,

      firImage: firImagePath,

      // checkbox on the form; anything except an explicit "false" = public
      photoPublic: !(
        req.body.photoPublic === "false" ||
        req.body.photoPublic === false
      ),


      /* =========================
         CASE
      ========================= */

      status: "Missing",

      reportedBy:
        req.user?.id ||
        req.user?._id,

      timeline: [
        {
          title:
            "Missing report filed",

          desc: staffFiled
            ? "Case entered by police / the TraceAI team (verified)."
            : "Missing person report submitted through TraceAI. Pending verification.",

          date: new Date(),
        },
      ],
    });


    /* =================================================
       AI FACE REGISTRATION
    ================================================= */

    if (imagePath) {
      try {
        const imageBase64 = await cloudStorage.readBase64(imagePath, resolveUploadPath);

        // DUPLICATE CHECK: is this face already in an open case?
        try {
          const dupResults = await searchFaceMatches(imageBase64, {
            topK: 5,
            threshold: DUPLICATE_THRESHOLD,
          });
          const duplicates = [];
          for (const cand of dupResults.flatMap((r) => r.candidates || [])) {
            const other = await MissingPerson.findOne({
              faceEngineId: cand.id,
              status: "Missing",
            }).select("caseId name gender");
            if (!other || String(other._id) === String(person._id)) continue;
            if (isGenderConflict(person.gender, other.gender)) continue;
            if (duplicates.some((d) => String(d.person) === String(other._id))) continue;
            duplicates.push({
              person: other._id,
              caseId: other.caseId,
              name: other.name,
              matchPercentage: cand.match_percentage,
            });
          }
          if (duplicates.length) {
            person.possibleDuplicates = duplicates;
            person.timeline.push({
              title: "Possible duplicate",
              desc: `Photo looks similar to ${duplicates
                .map((d) => d.caseId)
                .join(", ")}. The team will review.`,
              date: new Date(),
            });
          }
        } catch (dupError) {
          console.error("[createPerson] duplicate check skipped:", dupError.message);
        }

        const faceEngineId =
          await registerMissingFace({
            name: person.name,

            age: person.age,

            gender: person.gender,

            missingSince:
              person.lastSeenDate,

            lastSeenLocation:
              person.lastSeenLocation,

            contactNumber:
              person.contactPhone ||
              "N/A",

            notes:
              person.description,

            imageBase64,
          });

        if (faceEngineId) {
          person.faceEngineId =
            faceEngineId;
        }

        if (person.isModified()) {
          await person.save();
        }
      } catch (engineError) {
        console.error(
          "[createPerson] face engine registration skipped:",
          engineError.message
        );
      }
    }


    /* =================================================
       RETURN POPULATED REPORT
    ================================================= */

    const populatedPerson =
      await MissingPerson.findById(
        person._id
      ).populate(
        "reportedBy",
        "name email"
      );

    if (staffFiled) {
      writeAudit(req, "CASE_CREATED_BY_STAFF", `${person.caseId} (${person.name})`, "success");
    }

    // Confirmation email with the case ID (never blocks the response)
    notifyCaseFamily(person._id, "Missing person report received", [
      "Your report has been received. Keep this case ID to track it.",
      "If you get new information, add it from your TraceAI dashboard.",
      "آپ کی رپورٹ موصول ہو گئی ہے۔ کیس آئی ڈی محفوظ رکھیں۔",
    ]).catch(() => {});

    res.status(201).json(
      populatedPerson
    );

  } catch (error) {
    console.error(
      "CREATE PERSON ERROR:",
      error
    );

    res.status(500).json({
      message:
        error.message,
    });
  }
};


/* =====================================================
   GET ALL MISSING PERSONS
===================================================== */

const getPersons = async (req, res) => {
  try {
    // Public: only verified cases. Logged-in families also see their own
    // pending cases. Staff dashboards (admin, police, ngo) see everything.
    let listQuery = { verificationStatus: "verified" };
    if (req.user && DASHBOARD_ROLES.includes(req.user.role)) {
      listQuery = {};
    } else if (req.user) {
      listQuery = { $or: [{ verificationStatus: "verified" }, { reportedBy: req.user.id }] };
    }

    const persons =
      await MissingPerson.find(listQuery)
        .populate(
          "reportedBy",
          "name email"
        )
        .sort({
          createdAt: -1,
        });

    // Photo + basic info are public; CNIC, family contact, FIR and the
    // reporter's email stay private (removed below).
    const safePersons =
      persons.map((person) => {
        const obj =
          person.toObject();

    if (!canSeeRestricted(req.user, person)) {
      delete obj.cnic;
      delete obj.contactName;
      delete obj.contactPhone;
      delete obj.contactEmail;
      delete obj.fir;
      obj.firImage = null;
      // family chose to keep the photo private
      if (obj.photoPublic === false) obj.image = null;
      delete obj.possibleDuplicates;
      // reporter's email is private too (name still shows)
      if (obj.reportedBy && typeof obj.reportedBy === "object") {
        delete obj.reportedBy.email;
      }
      // children: hide photo/details unless police turned on a public alert
      toPublicView(obj);
    } else {
      obj.isMinor = isMinor(obj);
      obj.limitedView = false;
    }

        return obj;
      });

    res.status(200).json(
      safePersons
    );

  } catch (error) {
    console.error(
      "GET PERSONS ERROR:",
      error
    );

    res.status(500).json({
      message:
        "Failed to get missing persons",

      error:
        error.message,
    });
  }
};


/* =====================================================
   GET SINGLE MISSING PERSON
===================================================== */

const getPersonById = async (req, res) => {
  try {
    const id =
      req.params.id;

    const isObjectId =
      mongoose.Types.ObjectId.isValid(
        id
      );

    const query =
      isObjectId
        ? {
            $or: [
              {
                _id: id,
              },
              {
                caseId: id,
              },
            ],
          }
        : {
            caseId: id,
          };

    const person =
      await MissingPerson.findOne(
        query
      ).populate(
        "reportedBy",
        "name email"
      );

    if (!person) {
      return res.status(404).json({
        message:
          "Missing person not found",
      });
    }

    // Unverified cases exist only for the family and staff
    const isStaffViewer = req.user && DASHBOARD_ROLES.includes(req.user.role);
    if (person.verificationStatus !== "verified" && !isStaffViewer && !isOwner(req.user, person)) {
      return res.status(404).json({ message: "Missing person not found" });
    }

    const obj =
      person.toObject();

    /*
       Images are protected.
       Restricted information should
       only be exposed to authenticated
       users/admin according to your auth.
    */

    if (!canSeeRestricted(req.user, person)) {
      delete obj.cnic;
      delete obj.contactName;
      delete obj.contactPhone;
      delete obj.contactEmail;
      delete obj.fir;
      obj.firImage = null;
      if (obj.photoPublic === false) obj.image = null;
      delete obj.possibleDuplicates;
      if (obj.reportedBy && typeof obj.reportedBy === "object") {
        delete obj.reportedBy.email;
      }
      toPublicView(obj);
    } else {
      obj.isMinor = isMinor(obj);
      obj.limitedView = false;
    }

    res.status(200).json(
      obj
    );

  } catch (error) {
    console.error(
      "GET PERSON ERROR:",
      error
    );

    res.status(500).json({
      message:
        "Failed to get missing person",

      error:
        error.message,
    });
  }
};


/* =====================================================
   GET MY REPORTS
===================================================== */

const getMyPersons = async (req, res) => {
  try {
    const persons =
      await MissingPerson.find({
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
      persons
    );

  } catch (error) {
    console.error(
      "GET MY PERSONS ERROR:",
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


/* =====================================================
   UPDATE PERSON
===================================================== */

const updatePerson = async (req, res) => {
  try {
    const id =
      req.params.id;

    const isObjectId =
      mongoose.Types.ObjectId.isValid(
        id
      );

    const query =
      isObjectId
        ? {
            $or: [
              {
                _id: id,
              },
              {
                caseId: id,
              },
            ],
          }
        : {
            caseId: id,
          };

    const person =
      await MissingPerson.findOne(
        query
      );

    if (!person) {
      return res.status(404).json({
        message:
          "Missing person not found",
      });
    }


    /* =========================
       UPDATE ALLOWED FIELDS
    ========================= */

    const fields = [
      "name",
      "age",
      "gender",
      "lastSeenLocation",
      "lastSeenDate",
      "description",
      "cnic",
      "contactName",
      "contactPhone",
      "contactEmail",
      "fir",
      "photoPublic",
      "relationship",
      "bForm",
    ];

    // status goes through solved / reopened so solvedAt + timeline stay right
    const newStatus = req.body.status;
    if (newStatus !== undefined && newStatus !== person.status) {
      if (!["Missing", "Found", "Closed"].includes(newStatus)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      if (newStatus === "Found") applySolved(person, req, req.body.solvedNote);
      else if (newStatus === "Missing" && person.status === "Found") applyReopened(person);
      else person.status = newStatus;
    }

    fields.forEach((field) => {
      if (
        req.body[field] !==
        undefined
      ) {
        person[field] =
          req.body[field];
      }
    });


    /* =========================
       OPTIONAL TIMELINE EVENT
    ========================= */

    if (
      req.body.timelineEvent
    ) {
      if (
        !Array.isArray(
          person.timeline
        )
      ) {
        person.timeline = [];
      }

      person.timeline.push({
        title:
          req.body.timelineEvent
            .title ||
          "Case updated",

        desc:
          req.body.timelineEvent
            .desc ||
          "",

        date:
          req.body.timelineEvent
            .date ||
          new Date(),
      });
    }

    await person.save();

    const updated =
      await MissingPerson.findById(
        person._id
      ).populate(
        "reportedBy",
        "name email"
      );

    res.status(200).json(
      updated
    );

  } catch (error) {
    console.error(
      "UPDATE PERSON ERROR:",
      error
    );

    res.status(500).json({
      message:
        "Failed to update missing person",

      error:
        error.message,
    });
  }
};


/* =====================================================
   DELETE PERSON
===================================================== */

const deletePerson = async (req, res) => {
  try {
    const id =
      req.params.id;

    const isObjectId =
      mongoose.Types.ObjectId.isValid(
        id
      );

    const query =
      isObjectId
        ? {
            $or: [
              {
                _id: id,
              },
              {
                caseId: id,
              },
            ],
          }
        : {
            caseId: id,
          };

    const person =
      await MissingPerson.findOneAndDelete(
        query
      );

    if (!person) {
      return res.status(404).json({
        message:
          "Missing person not found",
      });
    }

    // Remove the photo + FIR scan from disk and the face from the AI engine,
    // so deleted cases don't leave orphan files or keep appearing as matches.
    removeUploadedFile(person.image);
    removeUploadedFile(person.firImage);

    if (person.faceEngineId) {
      await deleteFaceEngineCase(person.faceEngineId);
    }

    await FaceMatch.deleteMany({
      missingPerson: person._id,
    });


    await Tip.deleteMany({
      $or: [
        {
          caseId:
            person._id,
        },
        {
          caseTrackingId:
            person.caseId,
        },
      ],
    });


    res.status(200).json({
      message:
        "Missing person deleted successfully",
    });

  } catch (error) {
    console.error(
      "DELETE PERSON ERROR:",
      error
    );

    res.status(500).json({
      message:
        "Failed to delete missing person",

      error:
        error.message,
    });
  }
};


/* =====================================================
   SOLVE / REOPEN (police / admin)
   PUT /api/person/:id/solve  { solved: true|false, note }
===================================================== */

const solvePerson = async (req, res) => {
  try {
    const person = await MissingPerson.findOne(caseQuery(req.params.id));
    if (!person) return res.status(404).json({ message: "Missing person not found" });

    const solved = req.body.solved !== false;
    if (solved) {
      if (person.status === "Found") return res.status(200).json(person);
      applySolved(person, req, req.body.note);
    } else {
      if (person.status !== "Found") return res.status(200).json(person);
      applyReopened(person);
    }
    await person.save();

    writeAudit(
      req,
      solved ? "CASE_SOLVED" : "CASE_REOPENED",
      `${person.caseId} (${person.name})`,
      solved ? "success" : "warn"
    );

    if (solved) {
      notifyCaseFamily(person._id, "Your case has been marked solved", [
        "The TraceAI team / police have marked this case as solved.",
        "آپ کا کیس حل ہو گیا ہے۔",
      ]).catch(() => {});
    }

    const populated = await MissingPerson.findById(person._id).populate("reportedBy", "name email");
    res.status(200).json(populated);
  } catch (error) {
    console.error("SOLVE PERSON ERROR:", error);
    res.status(500).json({ message: "Failed to update case" });
  }
};

/* =====================================================
   OWNER EDIT (the family who filed the case)
   PUT /api/person/:id/edit   multipart (optional new photo)
   Changing name / photo / B-form on a verified case sends it back to
   pending so police re-check it (stops swapping in someone else).
===================================================== */

const OWNER_EDITABLE = [
  "name", "age", "gender", "lastSeenLocation", "lastSeenDate", "description",
  "contactName", "contactPhone", "contactEmail", "relationship", "bForm", "photoPublic",
];
const IDENTITY_FIELDS = ["name", "bForm"];

const ownerEditPerson = async (req, res) => {
  const newImage = req.files?.photo ? `/uploads/missing/${req.files.photo[0].filename}` : "";
  try {
    const person = await MissingPerson.findOne(caseQuery(req.params.id));
    if (!person) {
      removeUploadedFile(newImage);
      return res.status(404).json({ message: "Missing person not found" });
    }
    if (!isOwner(req.user, person)) {
      removeUploadedFile(newImage);
      return res.status(403).json({ message: "Only the family who filed this case can edit it." });
    }
    if (person.status !== "Missing") {
      removeUploadedFile(newImage);
      return res.status(400).json({ message: "A solved or closed case can't be edited." });
    }

    const changed = [];
    for (const field of OWNER_EDITABLE) {
      if (req.body[field] === undefined) continue;
      let value = req.body[field];

      if (field === "age") {
        value = value === "" ? undefined : Number(value);
        if (value !== undefined && (!Number.isFinite(value) || value < 0 || value > 120)) {
          removeUploadedFile(newImage);
          return res.status(400).json({ message: "Please enter a valid age." });
        }
      } else if (field === "gender") {
        const g = String(value).toLowerCase();
        value = g === "male" ? "Male" : g === "female" ? "Female" : "Other";
      } else if (field === "photoPublic") {
        value = !(value === "false" || value === false);
      } else if (field === "lastSeenDate") {
        value = value ? new Date(value) : null;
        if (value && isNaN(value)) value = null;
      } else if (field === "bForm") {
        value = formatId13(value);
      } else if (field === "relationship") {
        value = String(value).trim().slice(0, RELATIONSHIP_MAX);
      } else {
        value = String(value).trim().slice(0, field === "description" ? 2000 : 200);
      }

      const before = person[field] instanceof Date ? person[field].toISOString() : String(person[field] ?? "");
      const after = value instanceof Date ? value.toISOString() : String(value ?? "");
      if (before !== after) {
        person[field] = value;
        changed.push(field);
      }
    }

    if (!person.relationship) {
      removeUploadedFile(newImage);
      return res.status(400).json({ message: "Please select your relationship to the missing person." });
    }
    if (isMinor(person) && !person.bForm) {
      removeUploadedFile(newImage);
      return res.status(400).json({ message: "For a child (under 18) please enter the 13-digit B-form number." });
    }

    const oldImage = person.image;
    if (newImage) {
      person.image = newImage;
      changed.push("photo");
    }

    if (!changed.length) {
      return res.status(200).json({ message: "Nothing changed", person });
    }

    const identityChanged = changed.some((f) => IDENTITY_FIELDS.includes(f) || f === "photo");
    const needsRecheck = identityChanged && person.verificationStatus === "verified";
    if (needsRecheck) {
      person.verificationStatus = "pending";
      person.verificationMethod = "";
      person.verifiedBy = undefined;
      person.verifiedAt = undefined;
      person.publicAlert = false;
    }

    person.timeline.push({
      title: "Case details updated",
      desc: needsRecheck
        ? "The family updated the case. It will be verified again before it is public."
        : "The family updated the case details.",
      date: new Date(),
    });

    // New photo: replace the face in the AI engine
    if (newImage) {
      try {
        if (person.faceEngineId) await deleteFaceEngineCase(person.faceEngineId);
        person.faceEngineId = undefined;
        const imageBase64 = await cloudStorage.readBase64(newImage, resolveUploadPath);
        const faceEngineId = await registerMissingFace({
          name: person.name,
          age: person.age,
          gender: person.gender,
          missingSince: person.lastSeenDate,
          lastSeenLocation: person.lastSeenLocation,
          contactNumber: person.contactPhone || "N/A",
          notes: person.description,
          imageBase64,
        });
        if (faceEngineId) person.faceEngineId = faceEngineId;
      } catch (engineError) {
        console.error("[ownerEditPerson] face engine update skipped:", engineError.message);
      }
    }

    await person.save();
    if (newImage && oldImage && oldImage !== newImage) removeUploadedFile(oldImage);

    writeAudit(req, "CASE_EDITED_BY_FAMILY", `${person.caseId} (${changed.join(", ")})`, needsRecheck ? "warn" : "info");

    const populated = await MissingPerson.findById(person._id).populate("reportedBy", "name email");
    res.status(200).json({ message: needsRecheck ? "Saved — the case will be verified again." : "Saved", needsRecheck, person: populated });
  } catch (error) {
    removeUploadedFile(newImage);
    console.error("OWNER EDIT ERROR:", error);
    res.status(500).json({ message: "Failed to save changes" });
  }
};

/* =====================================================
   VERIFY CASE (police / admin)
   PUT /api/person/:id/verify  { status, method, note }
===================================================== */

const verifyPerson = async (req, res) => {
  try {
    const status = String(req.body.status || "");
    const method = String(req.body.method || "");
    const note = String(req.body.note || "").trim().slice(0, 300);

    if (!["verified", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ message: "status must be verified, rejected or pending" });
    }
    if (status === "verified" && !VERIFY_METHODS.includes(method)) {
      return res.status(400).json({ message: "Choose how the case was verified (FIR, phone call, documents, police station, other)." });
    }

    const person = await MissingPerson.findOne(caseQuery(req.params.id));
    if (!person) return res.status(404).json({ message: "Missing person not found" });

    person.verificationStatus = status;
    person.verificationMethod = status === "verified" ? method : "";
    person.verificationNote = note;
    person.verifiedBy = status === "pending" ? undefined : req.user.id;
    person.verifiedAt = status === "pending" ? undefined : new Date();

    // timeline is visible to the public on adult cases: keep it generic
    person.timeline.push({
      title:
        status === "verified" ? "Case verified" : status === "rejected" ? "Verification rejected" : "Moved back to pending",
      desc:
        status === "verified"
          ? `Verified by the TraceAI team / police (${VERIFY_METHOD_LABELS[method]}).`
          : status === "rejected"
          ? "The case could not be verified."
          : "The case is waiting for verification again.",
      date: new Date(),
    });

    if (status !== "verified") person.publicAlert = false;
    await person.save();

    writeAudit(
      req,
      status === "verified" ? "CASE_VERIFIED" : status === "rejected" ? "CASE_REJECTED" : "CASE_PENDING",
      `${person.caseId} (${person.name}) — ${status}${method ? ` via ${method}` : ""}${note ? `: ${note}` : ""}`,
      status === "verified" ? "success" : status === "rejected" ? "danger" : "info"
    );

    if (status === "verified") {
      notifyCaseFamily(person._id, "Your case has been verified", [
        "Your missing-person report has been verified by the TraceAI team / police.",
        isMinor(person)
          ? "Because this is a child, the photo and details stay private unless police issue a public alert."
          : "It is now visible on the TraceAI website so people can recognise the person and send tips.",
        "آپ کا کیس تصدیق ہو گیا ہے۔",
      ]).catch(() => {});
    }

    res.status(200).json(person);
  } catch (error) {
    console.error("VERIFY PERSON ERROR:", error);
    res.status(500).json({ message: "Failed to update verification" });
  }
};

/* =====================================================
   PUBLIC ALERT for a child case (police / admin)
   PUT /api/person/:id/public-alert  { publicAlert: true|false }
===================================================== */

const setPublicAlert = async (req, res) => {
  try {
    const publicAlert = req.body.publicAlert === true;
    const person = await MissingPerson.findOne(caseQuery(req.params.id));
    if (!person) return res.status(404).json({ message: "Missing person not found" });

    if (publicAlert && person.verificationStatus !== "verified") {
      return res.status(400).json({ message: "Verify the case before turning on a public alert." });
    }

    person.publicAlert = publicAlert;
    person.timeline.push({
      title: publicAlert ? "Public alert issued" : "Public alert ended",
      desc: publicAlert
        ? "Police made the photo and details public to help find the child."
        : "Photo and details are private again.",
      date: new Date(),
    });
    await person.save();

    writeAudit(
      req,
      publicAlert ? "PUBLIC_ALERT_ON" : "PUBLIC_ALERT_OFF",
      `${person.caseId} (${person.name})`,
      publicAlert ? "warn" : "info"
    );

    res.status(200).json(person);
  } catch (error) {
    console.error("PUBLIC ALERT ERROR:", error);
    res.status(500).json({ message: "Failed to update public alert" });
  }
};

/* =====================================================
   ADD FIR LATER (the family who filed, or police/admin)
   PUT /api/person/:id/fir  { fir }
===================================================== */

const addFir = async (req, res) => {
  try {
    const fir = String(req.body.fir || "").trim().slice(0, 50);
    if (!fir) return res.status(400).json({ message: "Please enter the FIR number." });

    const person = await MissingPerson.findOne(caseQuery(req.params.id));
    if (!person) return res.status(404).json({ message: "Missing person not found" });

    const isReviewer = RESTRICTED_DATA_ROLES.includes(req.user.role);
    if (!isReviewer && !isOwner(req.user, person)) {
      return res.status(403).json({ message: "Only the family who filed this case can add the FIR." });
    }

    person.fir = fir;
    person.timeline.push({
      title: "FIR added",
      desc: "An FIR number was added to this case.",
      date: new Date(),
    });
    await person.save();

    writeAudit(req, "FIR_ADDED", `${person.caseId} (${person.name})`, "info");

    res.status(200).json({ message: "FIR added", fir: person.fir });
  } catch (error) {
    console.error("ADD FIR ERROR:", error);
    res.status(500).json({ message: "Failed to add FIR" });
  }
};

/* =====================================================
   EXPORT
===================================================== */

module.exports = {
  solvePerson,
  ownerEditPerson,
  createPerson,
  getPersons,
  getPersonById,
  getMyPersons,
  updatePerson,
  deletePerson,
  verifyPerson,
  setPublicAlert,
  addFir,
};