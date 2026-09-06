import { useState, useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";
import { fmtDate } from "../data/mockData";
import { useData } from "../context/DataContext";

export default function PersonFoundDetail() {
  const { id } = useParams();
  const { t, lang } = useLanguage();
  const { founds } = useData();
  const [loading, setLoading] = useState(!founds.length);

  const f = founds.find((x) => x.id === id || x._id === id || x.caseId === id);

  useEffect(() => {
    if (founds.length > 0) {
      setLoading(false);
    } else {
      const timer = setTimeout(() => setLoading(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [founds]);

  if (loading) {
    return (
      <section className="wrap" style={{ paddingTop: 40 }}>
        <p>Loading report details...</p>
      </section>
    );
  }

  if (!f) return <Navigate to="/person-found" replace />;

  return (
    <section className="wrap" style={{ paddingTop: 28 }}>
      <div className="crumb"><Link to="/">{t("nav.home")}</Link> / <Link to="/person-found">{t("nav.found")}</Link> / {f.id}</div>
      <div className="case-detail">
        <div>
          <div className="cd-photo"><img src={f.photo} alt="Unidentified person" /></div>
          <span className={`badge ${f.longLost ? "badge-investigating" : "badge-tip"}`} style={{ marginTop: 12, display: "inline-block" }}>
            {f.longLost ? t("found.longLost") : t("found.recentlyFound")}
          </span>
          <Link to="/person-found" className="btn btn-outline btn-block" style={{ marginTop: 14 }}>← {t("found.back")}</Link>
        </div>
        <div>
          <h1>{t("found.unidentified")}</h1>
          <table className="info-table">
            <tbody>
              <tr><td>{t("found.currentAge")}</td><td>{f.currentAge}</td></tr>
              {f.ageWhenLost && <tr><td>{t("found.ageWhenLost")}</td><td>{f.ageWhenLost}</td></tr>}
              <tr><td>{t("detail.gender")}</td><td>{f.gender === "male" ? t("common.male") : t("common.female")}</td></tr>
              <tr><td>{t("found.foundLocation")}</td><td>{f.foundLocation}</td></tr>
              <tr><td>{t("found.foundDate")}</td><td>{fmtDate(f.foundDate, lang)}</td></tr>
              <tr><td>{t("found.shelterLocation")}</td><td>{f.shelterLocation}</td></tr>
              <tr><td>Description</td><td>{f.desc}</td></tr>
              <tr><td>{t("detail.marks")}</td><td>{f.marks}</td></tr>
            </tbody>
          </table>
          <div className="privacy-note">🔒 <span>{t("found.privacy")}</span></div>

          {/* <h3 style={{ marginTop: 28, marginBottom: 10 }}>{t("found.rememberTitle")}</h3>
          <p style={{ fontSize: 13, marginBottom: 14 }}>{t("found.rememberDesc")}</p>
          <table className="info-table">
            <tbody>
              <tr><td>{t("found.fatherName")}</td><td>{f.remembers.father}</td></tr>
              <tr><td>{t("found.motherName")}</td><td>{f.remembers.mother}</td></tr>
              <tr><td>{t("found.siblings")}</td><td>{f.remembers.siblings}</td></tr>
              <tr><td>{t("found.hometown")}</td><td>{f.remembers.hometown}</td></tr>
              <tr><td>{t("found.otherNotes")}</td><td>{f.remembers.notes}</td></tr>
            </tbody>
          </table> */}

          <div className="form-section" style={{ marginTop: 24 }}>
            <h3>{t("found.recognizeTitle")}</h3>
            <p className="hint">{t("found.recognizeDesc")}</p>
            <Link to="/contact" className="btn btn-primary">{t("found.recognizeCta")}</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
