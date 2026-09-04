import { useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";

export default function ReportFound() {
  const { t } = useLanguage();
  const { addFoundReport } = useData();
  const { user } = useAuth();

  const [submitted, setSubmitted] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();

    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());

    try {
      const created = await addFoundReport(data, user);

      setSubmitted(created.id);
    } catch (error) {
      console.error("Report submission failed:", error);
      alert(error.message || "Failed to submit report");
    }
  }

  if (submitted) {
    return (
      <section
        className="wrap"
        style={{ padding: "60px 0", textAlign: "center" }}
      >
        <div className="auth-shell">
          <h2>{t("confirmModal.foundTitle")}</h2>

          <p>{t("confirmModal.foundDesc")}</p>

          <div
            className="track-result found"
            style={{ fontSize: 16, fontWeight: 700 }}
          >
            {submitted}
          </div>

          <Link
            to="/"
            className="btn btn-outline"
            style={{ marginTop: 18 }}
          >
            {t("confirmModal.close")}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <div className="hero-mini wrap">
        <div className="crumb">
          <Link to="/">{t("nav.home")}</Link> /{" "}
          {t("reportFound.title")}
        </div>

        <h1>{t("reportFound.title")}</h1>

        <p style={{ maxWidth: "60ch", marginTop: 6 }}>
          {t("reportFound.desc")}
        </p>
      </div>

      <section className="wrap">
        <form className="form-shell" onSubmit={handleSubmit}>

          {/* PERSON INFORMATION */}
          <div className="form-section">
            <h3>1. {t("reportFound.s1")}</h3>

            <div className="form-grid">
              <div className="field full">
              <label>Person's Name *</label>

  <input name="name" type="text" placeholder="Enter person's name" required/></div>

              <div className="field full">
                <label>{t("reportFound.photo")}</label>

                <input
                  name="photo"
                  type="file"
                  accept="image/*"
                />
              </div>

             <div className="field">
                  <label>Current Age *</label>

                 <input
                 name="currentAge"
                  type="number"
                  min="0"
                 placeholder="Enter current age"
                 required
                   />
                  </div>

                           <div className="field">
                         <label>Estimated Age (When Lost) *</label>

                         <input
                        name="ageWhenLost"
                        type="number"
                         min="0"
                       placeholder="Enter estimated age when lost"
                      required
                            />
                     </div>

              <div className="field">
                <label>{t("reportFound.gender")}</label>

                <select name="gender">
                  <option value="male">
                    {t("common.male")}
                  </option>

                  <option value="female">
                    {t("common.female")}
                  </option>

                  <option value="other">
                    {t("common.other")}
                  </option>
                </select>
              </div>

              <div className="field">
                <label>{t("reportFound.category")}</label>

                <select name="category">
                  <option value="found">
                    {t("reportFound.catFound")}
                  </option>

                  <option value="longLost">
                    {t("reportFound.catLongLost")}
                  </option>
                </select>
              </div>

            </div>
          </div>


          {/* FOUND INFORMATION */}
          <div className="form-section">
            <h3>2. {t("reportFound.s2")}</h3>

            <div className="form-grid">
              

              <div className="field full">
                <label>
                  {t("reportFound.location")} *
                </label>

                <input
                  name="location"
                  required
                />
              </div>

              <div className="field full">
                <label>
                  {t("reportFound.dateTime")} *
                </label>

                <input
                  name="dateTime"
                  type="datetime-local"
                  required
                />
              </div>

            </div>
          </div>


          {/* DESCRIPTION */}
          <div className="form-section">
            <h3>3. {t("reportFound.s3")}</h3>

            <div className="form-grid">

              <div className="field full">
                <label>
                  Detail Description
                </label>

                <textarea name="physical" />
              </div>

              <div className="field full">
                <label>
                  {t("reportFound.marks")}
                </label>

                <input name="marks" />
              </div>

            </div>
          </div>


          {/* REPORTER INFORMATION */}
          <div className="form-section">
            <h3>4. {t("reportFound.s4")}</h3>

            <div className="form-grid">

              <div className="field">
                <label>
                  {t("reportFound.contactName")} *
                </label>

                <input
                  name="contactName"
                  required
                />
              </div>

              <div className="field">
                <label>
                  {t("reportFound.phone")} *
                </label>

                <input
                  name="phone"
                  required
                />
              </div>

            </div>

            <label
              style={{
                display: "flex",
                gap: 8,
                marginTop: 14,
                fontSize: 13
              }}
            >
              <input
                type="checkbox"
                required
              />

              {t("reportFound.confirm")}
            </label>
          </div>


          <button
            className="btn btn-primary"
            type="submit"
          >
            {t("reportFound.submit")}
          </button>

        </form>
      </section>
    </>
  );
}