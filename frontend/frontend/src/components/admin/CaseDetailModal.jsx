import { useState } from "react";
import { fmtAdmin } from "../../data/adminMockData";
import StatusBadge from "../StatusBadge";

export default function CaseDetailModal({
  c,
  onClose,
  onViewRestricted,
  onDelete,
    isAdmin,
}) {
  const [showRestricted, setShowRestricted] = useState(false);

  if (!c) return null;

  function handleRestricted() {
    setShowRestricted(true);

    if (onViewRestricted) {
      onViewRestricted(c.id);
    }
  }

  const reportedByName =
    typeof c.reportedBy === "object"
      ? c.reportedBy?.name ||
        c.reportedBy?.email ||
        "—"
      : c.reportedBy || "—";

  const tips = Array.isArray(c.tips) ? c.tips : [];

  const timeline = Array.isArray(c.timeline)
    ? c.timeline
    : [];

  return (
    <div
      className="modal-overlay"
      onClick={(e) =>
        e.target === e.currentTarget && onClose()
      }
    >
      <div className="modal-box">

        {/* HEADER */}
        <div className="modal-head">
          <h3>{c.name}</h3>

          <button
            className="modal-close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="modal-body">

          {/* BASIC INFORMATION */}
          <div
            style={{
              display: "flex",
              gap: 16,
              marginBottom: 16,
            }}
          >
            {c.photo ? (
              <img
                src={c.photo}
                alt={c.name}
                style={{
                  width: 90,
                  height: 112,
                  objectFit: "cover",
                  borderRadius: 10,
                }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div
                style={{
                  width: 90,
                  height: 112,
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid var(--border)",
                  fontSize: 12,
                  textAlign: "center",
                }}
              >
                No photo
              </div>
            )}

            <div style={{ flex: 1 }}>

              <div className="detail-row">
                <span className="k">Case ID</span>
                <span className="v mono">
                  {c.caseId || c.id || "—"}
                </span>
              </div>

              <div className="detail-row">
                <span className="k">Age / Gender</span>
                <span className="v">
                  {c.age ?? "—"} · {c.gender || "—"}
                </span>
              </div>

              <div className="detail-row">
                <span className="k">City</span>
                <span className="v">
                  {c.city || "—"}
                </span>
              </div>

              <div className="detail-row">
                <span className="k">Status</span>
                <span className="v">
                  <StatusBadge status={c.status} />
                </span>
              </div>

            </div>
          </div>

          {/* NORMAL INFORMATION */}

          <div className="detail-row">
            <span className="k">Last seen</span>
            <span className="v">
              {c.lastSeen ? fmtAdmin(c.lastSeen) : "—"}
            </span>
          </div>

          <div className="detail-row">
            <span className="k">FIR reference</span>
            <span className="v mono">
              {c.fir || c.firNo || "—"}
            </span>
          </div>

          <div className="detail-row">
            <span className="k">Reported by</span>
            <span className="v">
              {reportedByName}
            </span>
          </div>

          <div className="detail-row">
            <span className="k">Community tips</span>
            <span className="v">
              {tips.length}
            </span>
          </div>

          {/* SHOW TIPS */}
          {tips.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {tips.map((tip, index) => (
                <div
                  key={tip._id || tip.id || index}
                  style={{
                    padding: "10px 0",
                    borderBottom:
                      "1px solid var(--border)",
                  }}
                >
                  <strong>
                    {tip.title ||
                      tip.location ||
                      `Tip ${index + 1}`}
                  </strong>

                  <div style={{ marginTop: 4 }}>
                    {tip.description ||
                      tip.message ||
                      tip.text ||
                      "—"}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* RESTRICTED INFO */}
          {showRestricted && (
            <>
              <h4
                style={{
                  fontSize: 14,
                  marginTop: 18,
                }}
              >
                Restricted Info
              </h4>

              <div className="detail-row">
                <span className="k">CNIC</span>
                <span className="v mono">
                  {c.cnic ||
                    c.CNIC ||
                    c.nationalId ||
                    c.nationalID ||
                    "—"}
                </span>
              </div>

              <div className="detail-row">
                <span className="k">
                  Contact phone
                </span>
                <span className="v">
                  {c.contactPhone ||
                    c.phone ||
                    c.contact ||
                    "—"}
                </span>
              </div>

              <div className="detail-row">
                <span className="k">
                  Contact email
                </span>
                <span className="v">
                  {c.contactEmail ||
                    c.email ||
                    c.reportedByEmail ||
                    "—"}
                </span>
              </div>
            </>
          )}

          {/* TIMELINE */}
          <h4
            style={{
              fontSize: 14,
              marginTop: 18,
            }}
          >
            Case Timeline
          </h4>

          <div className="timeline-mini">

            {timeline.map((tl, i) => (
              <div
                key={tl._id || tl.id || i}
                className="tl-item"
              >
                <b>
                  {tl.title ||
                    tl.action ||
                    tl.event ||
                    "Case update"}
                </b>

                <p>
                  {tl.date
                    ? fmtAdmin(tl.date)
                    : tl.createdAt
                    ? fmtAdmin(tl.createdAt)
                    : "—"}

                  {" — "}

                  {tl.desc ||
                    tl.description ||
                    tl.message ||
                    "—"}
                </p>
              </div>
            ))}

            {timeline.length === 0 && (
              <div className="empty-state">
                No timeline events yet.
              </div>
            )}

          </div>

          {/* BUTTONS */}
          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 20,
              flexWrap: "wrap",
            }}
          >
                    {isAdmin && (
                     <button
                       className="btn btn-secondary btn-sm"
                   onClick={handleRestricted}
                   >
                        View Restricted Info
                          </button>
                    )}
           {isAdmin && onDelete && (
                <button
             className="btn btn-outline btn-sm"
                   style={{
                 color: "var(--emergency)",
                   borderColor: "var(--emergency)",
                  }}
                   onClick={() => onDelete(c.id)}
                         >
                    Delete Case
                     </button>
                    )}

            <button
              className="btn btn-outline btn-sm"
              onClick={onClose}
            >
              Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}