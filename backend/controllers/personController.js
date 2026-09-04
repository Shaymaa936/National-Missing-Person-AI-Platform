const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const MissingPerson = require("../models/MissingPerson");
const Tip = require("../models/Tip");
const FaceMatch = require("../models/FaceMatch");

const {
  registerMissingFace,
} = require("../services/faceMatchService");


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

    const caseId =
      "MP-2026-" +
      Math.floor(1000 + Math.random() * 9000);

    const person = await MissingPerson.create({
      caseId,

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

          desc:
            "Missing person report submitted through TraceAI.",

          date: new Date(),
        },
      ],
    });


    /* =================================================
       AI FACE REGISTRATION
    ================================================= */

    if (imagePath) {
      try {
        const absPath = path.join(
          __dirname,
          "..",
          imagePath
        );

        const imageBase64 =
          fs.readFileSync(
            absPath,
            {
              encoding: "base64",
            }
          );

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
    const persons =
      await MissingPerson.find()
        .populate(
          "reportedBy",
          "name email"
        )
        .sort({
          createdAt: -1,
        });

    const isLoggedIn =
      !!req.user;

    const safePersons =
      persons.map((person) => {
        const obj =
          person.toObject();

        if (!isLoggedIn) {
          obj.image = null;
          obj.firImage = null;

           delete obj.cnic;
  delete obj.contactName;
  delete obj.contactPhone;
  delete obj.contactEmail;
  delete obj.fir;
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

    const obj =
      person.toObject();

    /*
       Images are protected.
       Restricted information should
       only be exposed to authenticated
       users/admin according to your auth.
    */

    if (!req.user) {
      obj.image = null;
      obj.firImage = null;

      delete obj.cnic;
  delete obj.contactName;
  delete obj.contactPhone;
  delete obj.contactEmail;
  delete obj.fir;
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
      "status",
    ];

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


    await FaceMatch.deleteMany({
      missingPerson:
        person._id,
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
   EXPORT
===================================================== */

module.exports = {
  createPerson,
  getPersons,
  getPersonById,
  getMyPersons,
  updatePerson,
  deletePerson,
};