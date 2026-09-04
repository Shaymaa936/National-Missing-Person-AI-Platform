import { useState } from "react";
import { fmtAdmin } from "../../data/adminMockData";
import StatusBadge from "../StatusBadge";

export default function FoundDetailModal({ f, onClose, onViewRestricted, onApprove, onDelete, onSendFaceMatch,  isAdmin, }) {
  const [showRestricted, setShowRestricted] = useState(false);
  if (!f) return null;

  function handleRestricted() {
    setShowRestricted(true);
    onViewRestricted(f.id);
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-head">
          <h3>{f.name || "Unknown Person"}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
            <img src={f.photo} alt={f.id} style={{ width: 90, height: 112, objectFit: "cover", borderRadius: 10 }} />
            <div style={{ flex: 1 }}>
              <div className="detail-row"><span className="k">Report ID</span><span className="v mono">{f.id}</span></div>
              <div className="detail-row"><span className="k">Age / Gender</span><span className="v">{f.currentAge ?? "—"} · {f.gender}</span></div>
              <div className="detail-row"><span className="k">Category</span><span className="v">{f.longLost ? "Possibly long-lost" : "Recently lost"}</span></div>
              <div className="detail-row"><span className="k">Status</span><span className="v"><StatusBadge status={f.status} /></span></div>
            </div>
          </div>
          <div className="detail-row"><span className="k">Found at</span><span className="v">{f.foundLocation}</span></div>
          <div className="detail-row"><span className="k">Date found</span><span className="v">{fmtAdmin(f.foundDate)}</span></div>
          <div className="detail-row"><span className="k">Currently at</span><span className="v">{f.shelterLocation}</span></div>
          <div className="detail-row"><span className="k">Reported by</span><span className="v">{f.reportedBy}</span></div>
          <div className="detail-row"><span className="k">Physical description</span><span className="v">{f.desc}</span></div>
          <div className="detail-row"><span className="k">Identifying marks</span><span className="v">{f.marks}</span></div>

          {f.remembers && (
            <>
              <h4 style={{ fontSize: 14, marginTop: 18 }}>What They Remember</h4>
              <div className="detail-row"><span className="k">Father</span><span className="v">{f.remembers.father}</span></div>
              <div className="detail-row"><span className="k">Mother</span><span className="v">{f.remembers.mother}</span></div>
              <div className="detail-row"><span className="k">Siblings</span><span className="v">{f.remembers.siblings}</span></div>
              <div className="detail-row"><span className="k">Hometown</span><span className="v">{f.remembers.hometown}</span></div>
              <div className="detail-row"><span className="k">Other notes</span><span className="v">{f.remembers.notes}</span></div>
            </>
          )}

          {showRestricted && (
            <>
              <h4 style={{ fontSize: 14, marginTop: 18 }}>Restricted Info</h4>
              <div className="detail-row"><span className="k">Reporter contact</span><span className="v">{f.contactPhone || "—"}</span></div>
              <div className="detail-row"><span className="k">Reporter name</span> <span className="v">{f.contactName || "-"}</span></div>
               </>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
            {f.status === "pending" && (
              <button className="btn btn-success btn-sm" onClick={() => onApprove(f.id)}>Approve Report</button>
            )}
            {isAdmin && f.status === "pending" && (
  <button
    className="btn btn-success btn-sm"
    onClick={() => onApprove(f.id)}
  >
    Approve Report
  </button>
)}

{isAdmin && (
  <button
    className="btn btn-secondary btn-sm"
    onClick={() => onSendFaceMatch(f.id)}
  >
    Send for AI Face-Match
  </button>
)}

{isAdmin && (
  <button
    className="btn btn-secondary btn-sm"
    onClick={handleRestricted}
  >
    View Restricted Info
  </button>
)}

{isAdmin && (
  <button
    className="btn btn-outline btn-sm"
    style={{
      color: "var(--emergency)",
      borderColor: "var(--emergency)",
    }}
    onClick={() => onDelete(f.id)}
  >
    Delete Report
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
