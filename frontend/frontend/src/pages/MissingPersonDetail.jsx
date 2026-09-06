import { devError } from "../utils/logger";
import { useEffect, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";
import { daysBetween, fmtDate } from "../data/mockData";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/StatusBadge";
import { API_BASE } from "../api/apiClient";

/* =====================================================
   IMAGE URL
===================================================== */

function toImageUrl(image, fallback = "") {
  if (!image) return fallback;

  const token = localStorage.getItem("token");
  const tokenParam = token ? `?token=${token}` : "";

  return image.startsWith("http")
    ? image
    : `${API_BASE}${image}${tokenParam}`;
}

/* =====================================================
   NORMALIZE BACKEND CASE
===================================================== */

function normalizeBackendCase(person) {
  if (!person) return null;

  const description = person.description || "—";

  const marksMatch = description.match(
    /\|\s*Marks:\s*(.*?)(?=\s*\|\s*Clothing:|$)/i
  );

  const clothingMatch = description.match(
    /\|\s*Clothing:\s*(.*)$/i
  );

  const physical =
    description.split("|")[0]?.trim() || "—";

  const rawStatus =
    person.status?.toLowerCase() || "missing";

  return {
    /* ================================
       IDS
    ================================= */

    id:
      person.caseId ||
      person._id ||
      person.id,

    _id: person._id,

    caseId:
      person.caseId ||
      person._id ||
      person.id,

    /* ================================
       BASIC INFO
    ================================= */

    name:
      person.name ||
      "Unknown Person",

    age:
      person.age ??
      "—",

    gender:
      (person.gender || "Other").toLowerCase(),

    location:
      person.lastSeenLocation ||
      person.city ||
      "—",

    lastSeen:
      person.lastSeenDate ||
      person.lastSeen ||
      null,

    /* ================================
       DESCRIPTION
    ================================= */

    desc:
      physical,

    marks:
      marksMatch?.[1]?.trim() ||
      "—",

    clothing:
      clothingMatch?.[1]?.trim() ||
      "—",

    /* ================================
       CASE / FIR
    ================================= */

    fir:
      person.fir ||
      person.firNo ||
      person.firNumber ||
      "—",

    status:
      rawStatus === "missing"
        ? "active"
        : rawStatus,

    /* ================================
       IMAGE
    ================================= */

    photo:
      toImageUrl(person.image),

    /* ================================
       RESTRICTED INFORMATION
    ================================= */

    cnic:
      person.cnic ||
      person.CNIC ||
      person.nationalId ||
      "—",

    contactName:
      person.contactName ||
      "—",

    contactPhone:
      person.contactPhone ||
      person.contactNumber ||
      person.phone ||
      "—",

    contactEmail:
      person.contactEmail ||
      person.email ||
      "—",

    /* ================================
       REPORTER / ACCOUNT USER
    ================================= */

    reportedBy:
      typeof person.reportedBy === "object"
        ? person.reportedBy?.name ||
          person.reportedBy?.email ||
          "—"
        : person.reportedBy ||
          "—",

    reportedByEmail:
      typeof person.reportedBy === "object"
        ? person.reportedBy?.email || null
        : person.reportedByEmail || null,

    /* ================================
       TIPS
    ================================= */

    tips:
      Array.isArray(person.tips)
        ? person.tips
        : [],

    /* ================================
       TIMELINE
    ================================= */

    timeline:
      Array.isArray(person.timeline)
        ? person.timeline
        : [
            ...(person.lastSeenDate
              ? [
                  {
                    date: person.lastSeenDate,
                    title: "Last seen",
                    desc:
                      "This is the last reported date and time for the missing person.",
                  },
                ]
              : []),

            {
              date:
                person.createdAt ||
                new Date().toISOString(),

              title:
                "Missing report filed",

              desc:
                "Report submitted through the TraceAI portal.",
            },
          ],
  };
}

/* =====================================================
   COMPONENT
===================================================== */

export default function MissingPersonDetail() {
  const { id } = useParams();

  const { t, lang } = useLanguage();

  const { cases } = useData();

  const { isAdminAuthenticated } = useAuth();

  /* =====================================================
     FIND CASE FROM DATACONTEXT
  ===================================================== */

  const existingCase = cases.find(
    (x) =>
      x.id === id ||
      x.caseId === id ||
      x._id === id
  );

  /* =====================================================
     STATES
  ===================================================== */

  const [backendCase, setBackendCase] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [fetchFailed, setFetchFailed] =
    useState(false);

  const [showTipForm, setShowTipForm] =
    useState(false);

  const [tipMsg, setTipMsg] =
    useState("");

  const [localTips, setLocalTips] =
    useState([]);

  

  /* =====================================================
     LOAD CASE + TIPS
  ===================================================== */

  useEffect(() => {
    let cancelled = false;

    async function loadCase() {
      try {
        setLoading(true);
        setFetchFailed(false);

        const token =
          localStorage.getItem("token");

        /* ================================
           LOAD CASE
        ================================= */

        const response = await fetch(
          `${API_BASE}/api/person/${encodeURIComponent(id)}`,
          {
            headers: token
              ? {
                  Authorization:
                    `Bearer ${token}`,
                }
              : {},
          }
        );

        if (!response.ok) {
          throw new Error(
            "Case not found"
          );
        }

        const data =
          await response.json();

        const normalizedCase =
          normalizeBackendCase(data);

        /* ================================
           LOAD CASE TIPS
        ================================= */

        const caseKey =
          data.caseId ||
          data._id ||
          id;

        let tips = [];

        try {
          const tipsResponse =
            await fetch(
              `${API_BASE}/api/tips/case/${encodeURIComponent(
                caseKey
              )}`
            );

          if (tipsResponse.ok) {
            const tipsData =
              await tipsResponse.json();

            tips =
              Array.isArray(tipsData)
                ? tipsData
                : [];
          }
        } catch (tipError) {
          devError(
            "Failed to load case tips:",
            tipError
          );

          tips = [];
        }

        /* ================================
           SET CASE
        ================================= */

        if (!cancelled) {
          setBackendCase({
            ...normalizedCase,
            tips,
          });
        }
      } catch (error) {
        devError(
          "Case detail error:",
          error
        );

        if (!cancelled) {
          /*
            If DataContext already has the case,
            keep the page usable.
          */

          if (!existingCase) {
            setFetchFailed(true);
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCase();

    return () => {
      cancelled = true;
    };
  }, [id]);

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <section
        className="wrap"
        style={{ paddingTop: 40 }}
      >
        <p>Loading case...</p>
      </section>
    );
  }

  /* =====================================================
     CASE NOT FOUND
  ===================================================== */

  if (
    fetchFailed &&
    !existingCase &&
    !backendCase
  ) {
    return (
      <Navigate
        to="/missing-persons"
        replace
      />
    );
  }

  /* =====================================================
     FINAL CASE
  ===================================================== */

  const c =
    backendCase ||
    existingCase;

  if (!c) {
    return (
      <Navigate
        to="/missing-persons"
        replace
      />
    );
  }

  /* =====================================================
     DAYS MISSING
  ===================================================== */

  const days =
    daysBetween(c.lastSeen);

  /* =====================================================
     ONLY APPROVED TIPS ARE PUBLIC
  ===================================================== */

  const backendTips =
    Array.isArray(c.tips)
      ? c.tips
          .filter((tip) => {
            const status =
              tip.status?.toLowerCase();

            return status === "approved";
          })
          .map((tip) => ({
            id:
              tip._id ||
              tip.id,

            name:
              tip.name ||
              "Anonymous",

            date:
              tip.createdAt ||
              tip.date,

            location:
              tip.location ||
              "—",

            msg:
              tip.message ||
              tip.msg ||
              "",

            status:
              tip.status ||
              "approved",
          }))
      : [];

  /*
    Local submitted tips are normally "pending".
    Therefore they are NOT displayed publicly
    until admin approves them.
  */

  const approvedLocalTips =
    localTips.filter(
      (tip) =>
        tip.status?.toLowerCase() ===
        "approved"
    );

  /* =====================================================
     MERGE APPROVED TIPS
  ===================================================== */

  const allTips = [
    ...approvedLocalTips,

    ...backendTips.filter(
      (backendTip) =>
        !approvedLocalTips.some(
          (localTip) =>
            localTip.id &&
            backendTip.id &&
            localTip.id ===
              backendTip.id
        )
    ),
  ];

  /* =====================================================
     SUBMIT TIP
  ===================================================== */

  async function submitTip() {
    if (!tipMsg.trim()) {
      alert("Please enter a tip.");
      return;
    }

    try {
      const token =
        localStorage.getItem("token");

      const response =
        await fetch(
          `${API_BASE}/api/tips`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              ...(token
                ? {
                    Authorization:
                      `Bearer ${token}`,
                  }
                : {}),
            },

            body: JSON.stringify({
              caseId:
                c.caseId ||
                c._id ||
                c.id,

              message:
                tipMsg.trim(),

              name:
                "Anonymous",

              location:
                "—",
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to submit tip"
        );
      }

      /*
        New tips start as pending.
        Keep it locally only so it does NOT
        appear publicly before admin approval.
      */

      setLocalTips((prev) => [
        ...prev,
        {
          id:
            data.tip?._id,

          name:
            data.tip?.name ||
            "Anonymous",

          date:
            data.tip?.createdAt ||
            new Date().toISOString(),

          location:
            data.tip?.location ||
            "—",

          msg:
            data.tip?.message ||
            tipMsg.trim(),

          status:
            data.tip?.status ||
            "pending",
        },
      ]);

      setTipMsg("");
      setShowTipForm(false);

      alert(
        "Tip submitted successfully! It will appear after admin approval."
      );
    } catch (error) {
      devError(
        "Submit tip error:",
        error
      );

      alert(
        error.message ||
          "Failed to submit tip"
      );
    }
  }

  /* =====================================================
     UI
  ===================================================== */

  return (
    <section
      className="wrap"
      style={{ paddingTop: 28 }}
    >
      {/* =================================================
          BREADCRUMB
      ================================================= */}

      <div className="crumb">
        <Link to="/">
          {t("nav.home")}
        </Link>

        {" / "}

        <Link to="/missing-persons">
          {t("nav.missing")}
        </Link>

        {" / "}

        {c.id}
      </div>

      <div className="case-detail">

        {/* =================================================
            LEFT SIDE
        ================================================= */}

        <div>

          {/* IMAGE */}

          <div className="cd-photo">
            {c.photo ? (
              <img
                src={c.photo}
                alt={c.name}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                }}
              >
                No image
              </div>
            )}
          </div>

          {/* BASIC CASE INFO */}

          <div
            className="privacy-note"
            style={{
              marginTop: 12,
              flexDirection:
                "column",
              gap: 6,
            }}
          >

            {/* STATUS */}

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
              }}
            >
              <span>
                {t("detail.status")}
              </span>

              <StatusBadge
                status={c.status}
              />
            </div>

            {/* DAYS MISSING */}

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
              }}
            >
              <span>
                {t(
                  "detail.daysMissing"
                )}
              </span>

              <span>
                {days}
              </span>
            </div>

            {/* CASE NUMBER */}

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
              }}
            >
              <span>
                {t("detail.caseNo")}
              </span>

              <span>
                {c.id}
              </span>
            </div>

          </div>

          {/* BACK */}

          <Link
            to="/missing-persons"
            className="btn btn-outline btn-block"
            style={{
              marginTop: 14,
            }}
          >
            ← {t("detail.back")}
          </Link>

        </div>

        {/* =================================================
            RIGHT SIDE
        ================================================= */}

        <div>

          <h1>
            {c.name}
          </h1>

          {/* =================================================
              GENERAL INFORMATION
          ================================================= */}

          <table className="info-table">

            <tbody>

              {/* AGE */}

              <tr>
                <td>
                  {t("detail.age")}
                </td>

                <td>
                  {c.age}{" "}
                  {t("common.years")}
                </td>
              </tr>

              {/* GENDER */}

              <tr>
                <td>
                  {t("detail.gender")}
                </td>

                <td>
                  {c.gender ===
                  "male"
                    ? t(
                        "common.male"
                      )
                    : c.gender ===
                      "female"
                    ? t(
                        "common.female"
                      )
                    : c.gender}
                </td>
              </tr>

              {/* LAST LOCATION */}

              <tr>
                <td>
                  {t(
                    "detail.lastLocation"
                  )}
                </td>

                <td>
                  {c.location}
                </td>
              </tr>

              {/* LAST SEEN */}

              <tr>
                <td>
                  {t(
                    "detail.lastSeen"
                  )}
                </td>

                <td>
                  {fmtDate(
                    c.lastSeen,
                    lang
                  )}
                </td>
              </tr>

              {/* PHYSICAL */}

              <tr>
                <td>
                  {t(
                    "detail.physical"
                  )}
                </td>

                <td>
                  {c.desc}
                </td>
              </tr>

              {/* MARKS */}

              <tr>
                <td>
                  {t(
                    "detail.marks"
                  )}
                </td>

                <td>
                  {c.marks}
                </td>
              </tr>

              {/* CLOTHING */}

              <tr>
                <td>
                  {t(
                    "detail.clothing"
                  )}
                </td>

                <td>
                  {c.clothing}
                </td>
              </tr>

              {/* FIR */}

              <tr>
                <td>
                  FIR reference
                </td>

                <td>
                  {c.fir}
                </td>
              </tr>

              {/* REPORTED BY */}

              <tr>
                <td>
                  Reported by
                </td>

                <td>
                  {c.reportedBy}
                </td>
              </tr>

            </tbody>

          </table>

          {/* PRIVACY NOTE */}

          <div className="privacy-note">
            🔒{" "}
            <span>
              {t("detail.privacy")}
            </span>
          </div>

          {/* =================================================
              RESTRICTED INFO
              ADMIN ONLY
          ================================================= */}

          

          {/* =================================================
              TIMELINE
          ================================================= */}

          <h3
            style={{
              marginTop: 28,
              marginBottom: 4,
            }}
          >
            {t("detail.timeline")}
          </h3>

          <div className="timeline">

            {(c.timeline || []).map(
              (ev, i) => (
                <div
                  key={
                    ev._id ||
                    i
                  }
                  className="tl-item"
                >

                  <div
                    style={{
                      fontSize: 12,
                      color:
                        "var(--text-supporting)",
                    }}
                  >
                    {fmtDate(
                      ev.date,
                      lang
                    )}
                  </div>

                  <h5>
                    {ev.title}
                  </h5>

                  <p>
                    {ev.desc}
                  </p>

                </div>
              )
            )}

          </div>

          {/* =================================================
              COMMUNITY TIPS HEADER
          ================================================= */}

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              marginTop: 28,
              marginBottom: 10,
            }}
          >

            <h3>
              {t("detail.tips")} (
              {allTips.length}
              )
            </h3>

            <button
              className="btn btn-primary btn-sm"
              onClick={() =>
                setShowTipForm(
                  (v) => !v
                )
              }
            >
              {t(
                "detail.submitTip"
              )}
            </button>

          </div>

          {/* =================================================
              TIP FORM
          ================================================= */}

          {showTipForm && (
            <div
              className="form-section"
              style={{
                marginBottom: 18,
              }}
            >

              <h3>
                {t(
                  "tipForm.title"
                )}
              </h3>

              <p className="hint">
                {t(
                  "tipForm.desc"
                )}
              </p>

              <div className="field full">

                <label>
                  {t(
                    "tipForm.message"
                  )}{" "}
                  *
                </label>

                <textarea
                  value={tipMsg}
                  onChange={(e) =>
                    setTipMsg(
                      e.target.value
                    )
                  }
                />

              </div>

              <p
                style={{
                  fontSize: 12,
                  color:
                    "var(--text-supporting)",
                  marginTop: 10,
                }}
              >
                ⚠{" "}
                {t(
                  "tipForm.notice"
                )}
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 14,
                }}
              >

                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() =>
                    setShowTipForm(
                      false
                    )
                  }
                >
                  {t(
                    "tipForm.cancel"
                  )}
                </button>

                <button
                  className="btn btn-primary"
                  onClick={
                    submitTip
                  }
                >
                  {t(
                    "tipForm.submit"
                  )}
                </button>

              </div>

            </div>
          )}

          {/* =================================================
              COMMUNITY TIPS LIST
          ================================================= */}

          <div>

            {allTips.length ? (
              allTips.map(
                (tp, i) => (

                  <div
                    key={
                      tp.id ||
                      i
                    }
                    className="tip-card"
                  >

                    <div
                      style={{
                        fontSize: 12,
                        color:
                          "var(--text-supporting)",
                      }}
                    >
                      {fmtDate(
                        tp.date,
                        lang
                      )}{" "}
                      ·{" "}
                      {tp.location}
                    </div>

                    <p>
                      {tp.msg}
                    </p>

                  </div>

                )
              )
            ) : (
              <div className="dash-empty">
                {t(
                  "detail.noTips"
                )}
              </div>
            )}

          </div>

        </div>

      </div>

    </section>
  );
}