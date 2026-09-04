import { useState } from "react";
import { Link } from "react-router-dom";
import Tesseract from "tesseract.js";
import { useLanguage } from "../i18n/LanguageContext";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";

const EMPTY_FORM = {
  fullName: "", age: "", gender: "male", photo: null,
  lastLocation: "", lastDateTime: "",
  physical: "", marks: "", clothing: "",
  cnic: "", firNo: "",
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
    if (cnic) result.cnic = cnic;

    const firNo = grab(/f\.?i\.?r\.?\s*(?:no\.?|number)?\s*[:\-]\s*([A-Za-z0-9\/\-]{3,20})/i);
    if (firNo) result.firNo = firNo;

    const location = grab(/(?:place|location|address)(?: of occurrence)?\s*[:\-]\s*([^\n]{3,80})/i);
    if (location) result.lastLocation = location;

    return result;
  });
}

export default function ReportMissing() {
  const { t } = useLanguage();
  const { addMissingCase } = useData();
  const { user } = useAuth();
  const [submitted, setSubmitted] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
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

    setSubmitted(displayId);
  } catch (error) {
    console.error(
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
          <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "center" }}>
            <Link to="/dashboard" className="btn btn-primary">{t("confirmModal.dashBtn")}</Link>
            <Link to="/" className="btn btn-outline">{t("confirmModal.close")}</Link>
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
                  <select value={form.gender} onChange={(e) => updateField("gender", e.target.value)}>
                    <option value="male">{t("common.male")}</option>
                    <option value="female">{t("common.female")}</option>
                    <option value="other">{t("common.other")}</option>
                  </select>
                </div>
                <div className="field full">
                  <label>{t("reportMissing.photo")}</label>
                  <input type="file" accept="image/*" onChange={(e) => updateField("photo", e.target.files?.[0] || null)} />
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
                  <input value={form.cnic} onChange={(e) => updateField("cnic", e.target.value)} placeholder="xxxxx-xxxxxxx-x" />
                </div>
                <div className="field">
                  <label>{t("reportMissing.firNo")} ({t("reportMissing.firOpt")})</label>
                  <input value={form.firNo} onChange={(e) => updateField("firNo", e.target.value)} />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>5. {t("reportMissing.s5")}</h3>
              <p className="hint">{t("reportMissing.s5h")}</p>
              <div className="form-grid">
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