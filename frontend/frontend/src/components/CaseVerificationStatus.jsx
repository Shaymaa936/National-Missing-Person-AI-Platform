import { useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { API_BASE } from "../api/apiClient";
import "./CaseVerificationStatus.css";

// Shown under each of the family's own cases in "My Dashboard":
// verification status, and "Add FIR" for cases filed before the FIR.
export default function CaseVerificationStatus({ c, onUpdated }) {
  const { lang } = useLanguage();
  const ur = lang === "ur";
  const [fir, setFir] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const status = c.verificationStatus || "pending";
  const hasFir = !!(c.fir && c.fir.trim());

  async function saveFir(e) {
    e.preventDefault();
    if (!fir.trim()) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`${API_BASE}/api/person/${encodeURIComponent(c._id || c.caseId)}/fir`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ fir: fir.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed");
      setMsg(ur ? "ایف آئی آر شامل ہو گئی" : "FIR added");
      setFir("");
      onUpdated?.();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`cvs cvs--${status}`}>
      <div className="cvs-title">
        {status === "verified"
          ? (ur ? "✔ تصدیق شدہ" : "✔ Verified")
          : status === "rejected"
          ? (ur ? "✖ تصدیق نہیں ہو سکی" : "✖ Not verified")
          : (ur ? "⏳ تصدیق باقی ہے" : "⏳ Pending verification")}
      </div>

      <p className="cvs-text">
        {status === "verified"
          ? c.isMinor && !c.publicAlert
            ? (ur ? "بچے کا کیس: تصویر اور تفصیل صرف پولیس دیکھ سکتی ہے۔" : "Child case: details stay with police unless they issue a public alert.")
            : (ur ? "کیس عوام کے لیے ظاہر ہے۔" : "Your case is public so people can help.")
          : status === "rejected"
          ? c.verificationNote || (ur ? "مزید معلومات کے لیے رابطہ کریں۔" : "Please contact us for details.")
          : (ur ? "ابھی عوام کو نظر نہیں آتا۔ پولیس یا ٹریس اے آئی ٹیم آپ کو کال کرے گی۔" : "Not public yet. Police or the TraceAI team will call you to verify.")}
      </p>

      {status !== "verified" && !hasFir && (
        <form className="cvs-fir" onSubmit={saveFir}>
          <input
            value={fir}
            onChange={(e) => setFir(e.target.value)}
            placeholder={ur ? "ایف آئی آر نمبر (اگر مل گیا ہو)" : "FIR number (once you have it)"}
            maxLength={50}
          />
          <button type="submit" className="btn btn-sm btn-secondary" disabled={busy || !fir.trim()}>
            {ur ? "شامل کریں" : "Add FIR"}
          </button>
        </form>
      )}
      {hasFir && status !== "verified" && (
        <p className="cvs-text">{ur ? "ایف آئی آر:" : "FIR:"} <span className="mono">{c.fir}</span></p>
      )}
      {msg && <p className="cvs-msg">{msg}</p>}
    </div>
  );
}
