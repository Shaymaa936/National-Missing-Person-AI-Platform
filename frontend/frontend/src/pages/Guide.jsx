import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";

// Thematic illustrative photos per guide section (Unsplash's free-to-use
// keyword endpoint — same image source the rest of the demo data uses).
const IMAGES = {
  "missing-report": "/missing.jpeg",
  "found-someone":"/found.jpeg" ,
  "submit-tip":"/submittip.jpeg" ,
   "track-case": "/casetrack.jpeg",
};

export default function Guide() {
  const { t } = useLanguage();
  const groups = t("guide.groups");

  return (
    <>
      <div className="hero-mini wrap">
        <div className="crumb"><Link to="/">{t("nav.home")}</Link> / {t("nav.guide")}</div>
        <h1>{t("guide.title")}</h1>
        <p style={{ maxWidth: "60ch", marginTop: 6 }}>{t("guide.desc")}</p>
      </div>
      <section className="wrap">
        {Array.isArray(groups) && groups.map((g, i) => (
          <div key={i} className={`guide-section ${i % 2 === 1 ? "reverse" : ""}`}>
            <div className="guide-img">
              <img src={IMAGES[g.img] || IMAGES["missing-report"]} alt={g.t} loading="lazy" />
            </div>
            <div>
              <span className="guide-num">{String(i + 1).padStart(2, "0")}</span>
              <h3>{g.t}</h3>
              <ol>
                {g.items.map((it, j) => <li key={j}>{it}</li>)}
              </ol>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
