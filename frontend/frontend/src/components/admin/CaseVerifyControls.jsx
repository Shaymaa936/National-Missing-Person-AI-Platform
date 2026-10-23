import { useState } from "react";
import { API_BASE } from "../../api/apiClient";
import "./CaseVerifyControls.css";

const METHODS = [
  { value: "phone_call", label: "Phone call with family" },
  { value: "documents", label: "Documents checked (CNIC / B-form / photo)" },
  { value: "fir", label: "FIR checked" },
  { value: "police_station", label: "Confirmed with police station" },
  { value: "other", label: "Other" },
];

const METHOD_SHORT = {
  phone_call: "Phone call",
  documents: "Documents",
  fir: "FIR",
  police_station: "Police station",
  other: "Other",
};

/**
 * Verification cell for the admin "Missing Cases" table.
 * Admin/police: Verify (choose how) / Reject / back to pending, and a
 * Public alert switch for verified child cases. NGO: read-only badge.
 */
export default function CaseVerifyControls({ c, canReview, onDone, toast }) {
  const [mode, setMode] = useState(null); // "verify" | "reject" | null
  const [method, setMethod] = useState("phone_call");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const status = c.verificationStatus || "pending";
  const caseRef = c._id || c.id;

  async function call(path, body, okMsg) {
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/person/${encodeURIComponent(caseRef)}/${path}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Request failed");
      toast?.(okMsg);
      setMode(null);
      setNote("");
      onDone?.();
    } catch (err) {
      toast?.(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cvc">
      <span className={`cvc-badge cvc-badge--${status}`}>
        {status === "verified"
          ? `✔ Verified${c.verificationMethod ? ` · ${METHOD_SHORT[c.verificationMethod] || ""}` : ""}`
          : status === "rejected"
          ? "✖ Rejected"
          : "⏳ Pending"}
      </span>

      {c.isMinor && <span className="cvc-chip">Child</span>}

      {canReview && mode === null && (
        <div className="cvc-actions">
          {status !== "verified" && (
            <button type="button" className="cvc-btn cvc-btn--ok" disabled={busy} onClick={() => setMode("verify")}>
              Verify
            </button>
          )}
          {status === "pending" && (
            <button type="button" className="cvc-btn cvc-btn--no" disabled={busy} onClick={() => setMode("reject")}>
              Reject
            </button>
          )}
          {status !== "pending" && (
            <button
              type="button"
              className="cvc-btn"
              disabled={busy}
              onClick={() => call("verify", { status: "pending" }, "Moved back to pending")}
            >
              Undo
            </button>
          )}
          {status === "verified" && c.isMinor && (
            <button
              type="button"
              className={`cvc-btn ${c.publicAlert ? "cvc-btn--alert-on" : "cvc-btn--alert"}`}
              disabled={busy}
              title="Make the child's photo and details public (police decision)"
              onClick={() =>
                call(
                  "public-alert",
                  { publicAlert: !c.publicAlert },
                  c.publicAlert ? "Public alert ended" : "Public alert issued"
                )
              }
            >
              {c.publicAlert ? "🚨 Alert ON" : "Public alert"}
            </button>
          )}
        </div>
      )}

      {canReview && mode === "verify" && (
        <div className="cvc-panel">
          <label>How was it verified?</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            {METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <input placeholder="Note (private, optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
          <div className="cvc-actions">
            <button
              type="button"
              className="cvc-btn cvc-btn--ok"
              disabled={busy}
              onClick={() => call("verify", { status: "verified", method, note }, "Case verified")}
            >
              Confirm
            </button>
            <button type="button" className="cvc-btn" disabled={busy} onClick={() => setMode(null)}>Cancel</button>
          </div>
        </div>
      )}

      {canReview && mode === "reject" && (
        <div className="cvc-panel">
          <label>Reason (the family will see this)</label>
          <input placeholder="e.g. Could not reach the family" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
          <div className="cvc-actions">
            <button
              type="button"
              className="cvc-btn cvc-btn--no"
              disabled={busy}
              onClick={() => call("verify", { status: "rejected", note }, "Case rejected")}
            >
              Reject
            </button>
            <button type="button" className="cvc-btn" disabled={busy} onClick={() => setMode(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
