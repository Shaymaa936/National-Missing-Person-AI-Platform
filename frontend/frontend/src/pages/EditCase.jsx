import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { API_BASE } from "../api/apiClient";
import { formatCnic } from "../utils/cnic";
import { RELATIONSHIPS } from "../utils/relationships";
import PhotoQualityHint from "../components/PhotoQualityHint";
import "./EditCase.css";

// Description is saved as "physical | Marks: x | Clothing: y"
function splitDescription(description = "") {
  const out = { physical: "", marks: "", clothing: "" };
  String(description)
    .split("|")
    .map((p) => p.trim())
    .filter(Boolean)
    .forEach((part) => {
      if (/^marks:/i.test(part)) out.marks = part.replace(/^marks:\s*/i, "");
      else if (/^clothing:/i.test(part)) out.clothing = part.replace(/^clothing:\s*/i, "");
      else out.physical = out.physical ? `${out.physical} | ${part}` : part;
    });
  return out;
}

function joinDescription({ physical, marks, clothing }) {
  return [physical, marks ? `Marks: ${marks}` : "", clothing ? `Clothing: ${clothing}` : ""]
    .filter(Boolean)
    .join(" | ");
}

// <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in local time
function toLocalInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d)) return "";
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d - off).toISOString().slice(0, 16);
}

/**
 * The family edits their own case (from "My Dashboard").
 * Changing the name, photo or B-form of a verified case sends it back
 * for verification — the backend decides and tells us.
 */
export default function EditCase() {
  const { id } = useParams();
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const { reloadCases } = useData();
  const navigate = useNavigate();
  const ur = lang === "ur";

  const [original, setOriginal] = useState(null);
  const [form, setForm] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/api/person/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.message || "Case not found");
        return data;
      })
      .then((p) => {
        if (cancelled) return;
        const ownerId = p.reportedBy?._id || p.reportedBy;
        if (!ownerId || String(ownerId) !== String(user?.id || user?._id)) {
          setError(ur ? "صرف کیس درج کرنے والا خاندان اس میں ترمیم کر سکتا ہے۔" : "Only the family who filed this case can edit it.");
          return;
        }
        if (String(p.status || "").toLowerCase() !== "missing") {
          setError(ur ? "حل شدہ یا بند کیس میں ترمیم نہیں ہو سکتی۔" : "A solved or closed case can't be edited.");
          return;
        }
        setOriginal(p);
        setForm({
          name: p.name || "",
          age: p.age ?? "",
          gender: String(p.gender || "").toLowerCase(),
          lastSeenLocation: p.lastSeenLocation || "",
          lastSeenDate: toLocalInput(p.lastSeenDate),
          ...splitDescription(p.description),
          bForm: p.bForm || "",
          relationship: p.relationship || "",
          contactName: p.contactName || "",
          contactPhone: p.contactPhone || "",
          contactEmail: p.contactEmail || "",
          photoPublic: p.photoPublic !== false,
        });
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [id, user, ur]);

  function update(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const fd = new FormData();
      ["name", "age", "gender", "lastSeenLocation", "relationship", "contactName", "contactPhone", "contactEmail"].forEach(
        (k) => fd.append(k, form[k] ?? "")
      );
      fd.append("lastSeenDate", form.lastSeenDate ? new Date(form.lastSeenDate).toISOString() : "");
      fd.append("description", joinDescription(form));
      fd.append("photoPublic", form.photoPublic ? "true" : "false");
      if (isChild) fd.append("bForm", form.bForm);
      if (photo) fd.append("photo", photo);

      const res = await fetch(`${API_BASE}/api/person/${encodeURIComponent(original._id)}/edit`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to save changes");

      setDone({ needsRecheck: !!data.needsRecheck, nothing: data.message === "Nothing changed" });
      reloadCases?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const isChild = form && form.age !== "" && Number(form.age) < 18;

  if (done) {
    return (
      <section className="wrap edit-case-done">
        <div className="auth-shell">
          <h2>{done.nothing ? (ur ? "کوئی تبدیلی نہیں" : "No changes") : ur ? "تبدیلیاں محفوظ ہو گئیں" : "Changes saved"}</h2>
          {done.needsRecheck && (
            <p className="case-pending-note">
              ⏳ {ur
                ? "نام، تصویر یا ب فارم بدلا ہے، اس لیے کیس دوبارہ تصدیق تک پوشیدہ رہے گا۔"
                : "Name, photo or B-form changed, so the case is back in verification and hidden until it is re-checked."}
            </p>
          )}
          <div className="edit-case-actions">
            <Link to="/dashboard" className="btn btn-primary">{t("confirmModal.dashBtn")}</Link>
            <button type="button" className="btn btn-outline" onClick={() => navigate(0)}>
              {ur ? "دوبارہ ترمیم کریں" : "Edit again"}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <div className="hero-mini wrap">
        <div className="crumb">
          <Link to="/dashboard">{t("dashboard.title")}</Link> / {ur ? "کیس میں ترمیم" : "Edit case"}
        </div>
        <h1>{ur ? "کیس میں ترمیم کریں" : "Edit your case"}</h1>
        {original && (
          <p className="edit-case-id mono">{original.caseId}</p>
        )}
      </div>

      <section className="wrap edit-case">
        {error && <div className="edit-case-error">{error}</div>}

        {!form && !error && <p className="edit-case-loading">{ur ? "لوڈ ہو رہا ہے…" : "Loading…"}</p>}

        {form && (
          <form className="form-shell" onSubmit={handleSubmit}>
            {original?.verificationStatus === "verified" && (
              <p className="edit-case-note">
                ℹ {ur
                  ? "نام، تصویر یا ب فارم بدلنے پر کیس دوبارہ تصدیق کے لیے جائے گا۔ باقی تفصیلات فوراً اپڈیٹ ہو جائیں گی۔"
                  : "Changing the name, photo or B-form sends the case back for verification. Other details update straight away."}
              </p>
            )}

            <div className="form-section">
              <h3>1. {t("reportMissing.s1")}</h3>
              <div className="form-grid">
                <div className="field full">
                  <label>{t("reportMissing.fullName")} *</label>
                  <input value={form.name} onChange={(e) => update("name", e.target.value)} required maxLength={200} />
                </div>
                <div className="field">
                  <label>{t("reportMissing.age")} *</label>
                  <input type="number" min="0" max="120" value={form.age} onChange={(e) => update("age", e.target.value)} required />
                </div>
                <div className="field">
                  <label>{t("reportMissing.gender")} *</label>
                  <select value={form.gender} onChange={(e) => update("gender", e.target.value)} required>
                    <option value="" disabled>{t("common.selectGender")}</option>
                    <option value="male">{t("common.male")}</option>
                    <option value="female">{t("common.female")}</option>
                    <option value="other">{t("common.other")}</option>
                  </select>
                </div>
                <div className="field full">
                  <label>{ur ? "نئی تصویر (اختیاری)" : "New photo (optional)"}</label>
                  <div className="edit-case-photo">
                    {original?.image && !photo && (
                      <img
                        src={`${API_BASE}${original.image}?token=${localStorage.getItem("token") || ""}`}
                        alt={original.name}
                      />
                    )}
                    <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
                  </div>
                  <PhotoQualityHint file={photo} />
                </div>
                <div className="field full">
                  <label className="consent-check">
                    <input type="checkbox" checked={form.photoPublic} onChange={(e) => update("photoPublic", e.target.checked)} />
                    <span>{t("reportMissing.photoPublic")}</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>2. {t("reportMissing.s2")}</h3>
              <div className="form-grid">
                <div className="field full">
                  <label>{t("reportMissing.lastLocation")} *</label>
                  <input value={form.lastSeenLocation} onChange={(e) => update("lastSeenLocation", e.target.value)} required />
                </div>
                <div className="field full">
                  <label>{t("reportMissing.lastDateTime")} *</label>
                  <input type="datetime-local" value={form.lastSeenDate} onChange={(e) => update("lastSeenDate", e.target.value)} required />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>3. {t("reportMissing.s3")}</h3>
              <div className="form-grid">
                <div className="field full">
                  <label>{t("reportMissing.physical")}</label>
                  <textarea value={form.physical} onChange={(e) => update("physical", e.target.value)} />
                </div>
                <div className="field">
                  <label>{t("reportMissing.marks")}</label>
                  <input value={form.marks} onChange={(e) => update("marks", e.target.value)} />
                </div>
                <div className="field">
                  <label>{t("reportMissing.clothing")}</label>
                  <input value={form.clothing} onChange={(e) => update("clothing", e.target.value)} />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>4. {t("reportMissing.s5")}</h3>
              <div className="form-grid">
                {isChild && (
                  <div className="field full">
                    <label>{ur ? "بچے کا ب فارم نمبر *" : "Child's B-form number *"}</label>
                    <input
                      value={form.bForm}
                      onChange={(e) => update("bForm", formatCnic(e.target.value))}
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
                <div className="field full">
                  <label>{ur ? "لاپتہ شخص سے آپ کا رشتہ *" : "Your relationship to the missing person *"}</label>
                  <select value={form.relationship} onChange={(e) => update("relationship", e.target.value)} required>
                    <option value="" disabled>{ur ? "منتخب کریں" : "Select"}</option>
                    {RELATIONSHIPS.map((r) => (
                      <option key={r.value} value={r.value}>{ur ? r.ur : r.en}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>{t("reportMissing.contactName")} *</label>
                  <input value={form.contactName} onChange={(e) => update("contactName", e.target.value)} required />
                </div>
                <div className="field">
                  <label>{t("reportMissing.phone")} *</label>
                  <input value={form.contactPhone} onChange={(e) => update("contactPhone", e.target.value)} required />
                </div>
                <div className="field full">
                  <label>{t("reportMissing.email")}</label>
                  <input type="email" value={form.contactEmail} onChange={(e) => update("contactEmail", e.target.value)} />
                </div>
              </div>
            </div>

            <div className="edit-case-actions">
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? (ur ? "محفوظ ہو رہا ہے…" : "Saving…") : ur ? "تبدیلیاں محفوظ کریں" : "Save changes"}
              </button>
              <Link to="/dashboard" className="btn btn-outline">
                {ur ? "منسوخ" : "Cancel"}
              </Link>
            </div>
          </form>
        )}
      </section>
    </>
  );
}
