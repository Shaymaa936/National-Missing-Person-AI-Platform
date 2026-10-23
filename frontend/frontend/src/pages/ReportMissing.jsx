import { devError } from "../utils/logger";
import { useState } from "react";
import { Link } from "react-router-dom";
import Tesseract from "tesseract.js";
import { useLanguage } from "../i18n/LanguageContext";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import { formatCnic } from "../utils/cnic";
import PhotoQualityHint from "../components/PhotoQualityHint";
import { RELATIONSHIPS } from "../utils/relationships";
import "./ReportMissing.css";

const EMPTY_FORM = {
  fullName: "", age: "", gender: "", photo: null, photoPublic: true,
  lastLocation: "", lastDateTime: "",
  physical: "", marks: "", clothing: "",
  cnic: "", firNo: "", bForm: "", relationship: "",
  contactName: "", phone: "", email: "",
};

/**
 * Runs OCR on an uploaded FIR photo/scan and tries to pull out the
 * fields we care about with simple label-based regex matching.
 * Returns a Promise that resolves to a partial form object — only
 * the fields it could actually find are included, so it never wipes
 * out something the user already typed.
 */
function extractFirData(file) {
  return Tesseract.recognize(file, "eng").then(({ data: { text } }) => {
    const grab = (regex) => {
      const m = text.match(regex);
      return m ? m[1].trim() : null;
    };

    const result = {};

    const name = grab(/name\s*[:\-]\s*([A-Za-z\s]{3,50})/i);
    if (name) result.fullName = name;

    const age = grab(/age\s*[:\-]\s*(\d{1,3})/i);
    if (age) result.age = age;

    const genderRaw = grab(/(?:gender|sex)\s*[:\-]\s*(male|female|other|m|f)/i);
    if (genderRaw) {
      const g = genderRaw.toLowerCase();
      result.gender = g === "m" ? "male" : g === "f" ? "female" : g;
    }

    const cnic = grab(/cnic\s*(?:no\.?|number)?\s*[:\-]\s*([\d\-]{13,15})/i);
    if (cnic) result.cnic = formatCnic(cnic);

    const firNo = grab(/f\.?i\.?r\.?\s*(?:no\.?|number)?\s*[:\-]\s*([A-Za-z0-9\/\-]{3,20})/i);
    if (firNo) result.firNo = firNo;

    const location = grab(/(?:place|location|address)(?: of occurrence)?\s*[:\-]\s*([^\n]{3,80})/i);
    if (location) result.lastLocation = location;

    return result;
  });
}

export default function ReportMissing() {
  const { t, lang } = useLanguage();
  const { addMissingCase } = useData();
  const { user } = useAuth();
  const [submitted, setSubmitted] = useState(null);
  // open cases that look like the same person (from the AI duplicate check)
  const [duplicates, setDuplicates] = useState([]);
  // police / admin entering a case themselves: auto-verified by the backend
  const isStaffFiler = ["admin", "police"].includes(user?.role);
  const [form, setForm] = useState(() =>
    isStaffFiler ? { ...EMPTY_FORM, relationship: "Police / Official" } : EMPTY_FORM
  );
  const [firFile, setFirFile] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState("");
  const [ocrFilled, setOcrFilled] = useState([]); // field names auto-filled, for a small "from FIR" hint

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleFirUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFirFile(file);
    setOcrError("");
    setOcrLoading(true);

    extractFirData(file)
      .then((extracted) => {
        const filledKeys = Object.keys(extracted);
        if (filledKeys.length === 0) {
          setOcrError(t("reportMissing.ocrNoMatch") || "Could not read details from this image — please fill the form manually.");
          return;
        }
        setForm((prev) => ({ ...prev, ...extracted }));
        setOcrFilled(filledKeys);
      })
      .catch(() => {
        setOcrError(t("reportMissing.ocrFailed") || "Could not process this image. You can still fill the form manually.");
      })
      .finally(() => setOcrLoading(false));
  }

 async function handleSubmit(e) {
  e.preventDefault();

  try {
    // IMPORTANT:
    // DataContext ke through submit karna hai
    // taa ke CNIC, FIR, contact name, phone aur email
    // sab backend ko properly bheje ja saken.
    const result = await addMissingCase(
      {
        ...form,
        firFile,
      },
      user
    );

    const displayId =
      result?.caseId ||
      result?.id ||
      (result?._id
        ? `MP-2026-${String(result._id)
            .slice(-4)
            .toUpperCase()}`
        : "MP-2026-0001");

    setDuplicates(Array.isArray(result?.possibleDuplicates) ? result.possibleDuplicates : []);
    setSubmitted(displayId);
  } catch (error) {
    devError(
      "Report submission error:",
      error
    );

    alert(
      error.message ||
        "Report submission failed"
    );
  }
}

  if (submitted) {
    return (
      <section className="wrap" style={{ padding: "60px 0", textAlign: "center" }}>
        <div className="auth-shell">
          <h2>{t("confirmModal.missingTitle")}</h2>
          <p>{t("confirmModal.missingDesc")}</p>
          <div className="track-result found" style={{ fontSize: 16, fontWeight: 700 }}>{submitted}</div>
          {isStaffFiler ? (
            <p className="case-pending-note case-pending-note--ok">
              ✔ {lang === "ur"
                ? "کیس پولیس / ٹریس اے آئی ٹیم کی طرف سے درج ہوا ہے اور تصدیق شدہ ہے۔ اے آئی میچنگ شروع ہو گئی ہے۔"
                : "Case entered by police / TraceAI team and verified. AI matching has started."}
            </p>
          ) : (
            <p className="case-pending-note">
              ⏳ {lang === "ur"
                ? "تصدیق باقی ہے — ابھی عوامی نہیں۔ پولیس یا ٹریس اے آئی ٹیم آپ کو کال کرے گی۔ اے آئی میچنگ شروع ہو چکی ہے۔"
                : "Pending verification — not public yet. Police or the TraceAI team will call you. AI matching has already started."}
            </p>
          )}
          {duplicates.length > 0 && (
            <p className="dup-warning" style={{ marginTop: 14, textAlign: "start" }}>
              ⚠ {lang === "ur"
                ? "ملتا جلتا کیس پہلے سے موجود ہو سکتا ہے: "
                : "A similar case may already be reported: "}
              <b>{duplicates.map((d) => d.caseId).join(", ")}</b>
              {lang === "ur" ? "۔ ہماری ٹیم جائزہ لے گی۔" : ". Our team will review it."}
            </p>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "center" }}>
            {isStaffFiler ? (
              <>
                <Link to="/admin/dashboard" className="btn btn-primary">
                  {lang === "ur" ? "ایڈمن پینل پر واپس" : "Back to admin panel"}
                </Link>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setSubmitted(null);
                    setDuplicates([]);
                    setForm({ ...EMPTY_FORM, relationship: "Police / Official" });
                    setFirFile(null);
                    setOcrFilled([]);
                  }}
                >
                  {lang === "ur" ? "ایک اور کیس درج کریں" : "Enter another case"}
                </button>
              </>
            ) : (
              <>
                <Link to="/dashboard" className="btn btn-primary">{t("confirmModal.dashBtn")}</Link>
                <Link to="/" className="btn btn-outline">{t("confirmModal.close")}</Link>
              </>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <div className="hero-mini wrap">
        <div className="crumb"><Link to="/">{t("nav.home")}</Link> / {t("reportMissing.title")}</div>
        <h1>{t("reportMissing.title")}</h1>
        <p style={{ maxWidth: "60ch", marginTop: 6 }}>{t("reportMissing.desc")}</p>
        {isStaffFiler && (
          <div className="staff-filing-banner">
            <i className="fa-solid fa-shield-halved" aria-hidden="true" />
            <div>
              <b>{lang === "ur" ? "پولیس / ٹریس اے آئی ٹیم کی جانب سے کیس" : "Entering a case as police / TraceAI team"}</b>
              <span>
                {lang === "ur"
                  ? "فوراً تصدیق شدہ، روزانہ کی حد نہیں۔ نیچے خاندان یا افسر کا رابطہ دیں۔"
                  : "Verified immediately, no daily limit. Add the family's or officer's contact below."}
              </span>
            </div>
            <Link to="/admin/dashboard" className="btn btn-outline btn-sm">
              {lang === "ur" ? "← ایڈمن" : "← Admin"}
            </Link>
          </div>
        )}
      </div>
      <section className="wrap">
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>

          {/* ---- Optional FIR upload side panel ---- */}
          <aside className="form-section" style={{ width: 260, flexShrink: 0 }}>
            <h3 style={{ fontSize: 14.5 }}>Upload FIR (Optional)</h3>
            <p className="hint" style={{ marginBottom: 12 }}>
              Have a copy of the FIR? Upload a photo and we'll try to auto-fill the form below — you can review and edit everything before submitting.
            </p>
            <label className="btn btn-outline btn-sm btn-block" style={{ cursor: "pointer" }}>
              {ocrLoading ? "Reading document…" : firFile ? "Change FIR photo" : "Upload FIR photo"}
              <input
                type="file"
                accept="image/*"
                onChange={handleFirUpload}
                disabled={ocrLoading}
                style={{ display: "none" }}
              />
            </label>
            {firFile && !ocrLoading && (
              <p style={{ fontSize: 12, marginTop: 8, color: "var(--text-supporting)" }}>{firFile.name}</p>
            )}
            {ocrError && (
              <p style={{ fontSize: 12, marginTop: 8, color: "var(--emergency)" }}>{ocrError}</p>
            )}
            {ocrFilled.length > 0 && !ocrLoading && !ocrError && (
              <p style={{ fontSize: 12, marginTop: 8, color: "#059669" }}>
                Auto-filled {ocrFilled.length} field(s) from the FIR — please double-check them below.
              </p>
            )}
          </aside>

          {/* ---- Main form ---- */}
          <form className="form-shell" style={{ flex: 1, minWidth: 280 }} onSubmit={handleSubmit}>
            <div className="form-section">
              <h3>1. {t("reportMissing.s1")}</h3>
              <p className="hint">{t("reportMissing.s1h")}</p>
              <div className="form-grid">
                <div className="field full">
                  <label>{t("reportMissing.fullName")} *</label>
                  <input value={form.fullName} onChange={(e) => updateField("fullName", e.target.value)} required />
                </div>
                <div className="field">
                  <label>{t("reportMissing.age")} *</label>
                  <input type="number" min="0" value={form.age} onChange={(e) => updateField("age", e.target.value)} required />
                </div>
                <div className="field">
                  <label>{t("reportMissing.gender")} *</label>
                  <select value={form.gender} onChange={(e) => updateField("gender", e.target.value)} required>
                    <option value="" disabled>{t("common.selectGender")}</option>
                    <option value="male">{t("common.male")}</option>
                    <option value="female">{t("common.female")}</option>
                    <option value="other">{t("common.other")}</option>
                  </select>
                </div>
                <div className="field full">
                  <label>{t("reportMissing.photo")}</label>
                  <input type="file" accept="image/*" onChange={(e) => updateField("photo", e.target.files?.[0] || null)} />
                  <PhotoQualityHint file={form.photo} />
                </div>
                <div className="field full">
                  <label className="consent-check">
                    <input
                      type="checkbox"
                      checked={form.photoPublic}
                      onChange={(e) => updateField("photoPublic", e.target.checked)}
                    />
                    <span>{t("reportMissing.photoPublic")}</span>
                  </label>
                  <p className="consent-hint">{t("reportMissing.photoPublicHint")}</p>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>2. {t("reportMissing.s2")}</h3>
              <p className="hint">{t("reportMissing.s2h")}</p>
              <div className="form-grid">
                <div className="field full">
                  <label>{t("reportMissing.lastLocation")} *</label>
                  <input value={form.lastLocation} onChange={(e) => updateField("lastLocation", e.target.value)} required />
                </div>
                <div className="field full">
                  <label>{t("reportMissing.lastDateTime")} *</label>
                  <input type="datetime-local" value={form.lastDateTime} onChange={(e) => updateField("lastDateTime", e.target.value)} required />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>3. {t("reportMissing.s3")}</h3>
              <p className="hint">{t("reportMissing.s3h")}</p>
              <div className="form-grid">
                <div className="field full">
                  <label>{t("reportMissing.physical")}</label>
                  <textarea value={form.physical} onChange={(e) => updateField("physical", e.target.value)} />
                </div>
                <div className="field">
                  <label>{t("reportMissing.marks")}</label>
                  <input value={form.marks} onChange={(e) => updateField("marks", e.target.value)} />
                </div>
                <div className="field">
                  <label>{t("reportMissing.clothing")}</label>
                  <input value={form.clothing} onChange={(e) => updateField("clothing", e.target.value)} />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>4. {t("reportMissing.s4")}</h3>
              <p className="hint">{t("reportMissing.s4h")}</p>
              <div className="form-grid">
                <div className="field">
                  <label>{t("reportMissing.cnic")}</label>
                  <input
                    value={form.cnic}
                    onChange={(e) => updateField("cnic", formatCnic(e.target.value))}
                    placeholder="xxxxx-xxxxxxx-x"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={15}
                    pattern="\d{5}-\d{7}-\d"
                    title="13-digit CNIC, e.g. 35202-1234567-1"
                  />
                </div>
                <div className="field">
                  <label>{t("reportMissing.firNo")} ({t("reportMissing.firOpt")})</label>
                  <input value={form.firNo} onChange={(e) => updateField("firNo", e.target.value)} />
                </div>
                {form.age !== "" && Number(form.age) < 18 && (
                  <div className="field">
                    <label>{lang === "ur" ? "بچے کا ب فارم نمبر *" : "Child's B-form number *"}</label>
                    <input
                      value={form.bForm}
                      onChange={(e) => updateField("bForm", formatCnic(e.target.value))}
                      placeholder="xxxxx-xxxxxxx-x"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={15}
                      pattern="\d{5}-\d{7}-\d"
                      title="13-digit B-form number, e.g. 35202-1234567-1"
                      required
                    />
                  </div>
                )}
              </div>
              <p className="hint" style={{ marginTop: 10, marginBottom: 0 }}>
                {lang === "ur"
                  ? "ابھی ایف آئی آر نہیں؟ رپورٹ جمع کریں — ایف آئی آر بعد میں ڈیش بورڈ سے شامل کر سکتے ہیں۔"
                  : "No FIR yet? Submit now — you can add it later from your dashboard."}
              </p>
            </div>

            <div className="form-section">
              <h3>5. {t("reportMissing.s5")}</h3>
              <p className="hint">{t("reportMissing.s5h")}</p>
              <div className="form-grid">
                <div className="field full">
                  <label>{lang === "ur" ? "لاپتہ شخص سے آپ کا رشتہ *" : "Your relationship to the missing person *"}</label>
                  <select value={form.relationship} onChange={(e) => updateField("relationship", e.target.value)} required>
                    <option value="" disabled>{lang === "ur" ? "منتخب کریں" : "Select"}</option>
                    {RELATIONSHIPS.map((r) => (
                      <option key={r.value} value={r.value}>{lang === "ur" ? r.ur : r.en}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>{t("reportMissing.contactName")} *</label>
                  <input value={form.contactName} onChange={(e) => updateField("contactName", e.target.value)} required />
                </div>
                <div className="field">
                  <label>{t("reportMissing.phone")} *</label>
                  <input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} required />
                </div>
                <div className="field full">
                  <label>{t("reportMissing.email")}</label>
                  <input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} />
                </div>
              </div>
              <label style={{ display: "flex", gap: 8, marginTop: 14, fontSize: 13 }}>
                <input type="checkbox" required /> {t("reportMissing.confirm")}
              </label>
            </div>

            <button className="btn btn-primary" type="submit">{t("reportMissing.submit")}</button>
          </form>
        </div>
      </section>
    </>
  );
}