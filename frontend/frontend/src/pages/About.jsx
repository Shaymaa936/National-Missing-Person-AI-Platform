import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";
import "./About.css";

export default function About() {
  const { t } = useLanguage();

  const cards = [
    { icon: "fa-gears", t: t("about.c2t"), d: t("about.c2") },
    { icon: "fa-people-group", t: t("about.c3t"), d: t("about.c3") },
  ];

  return (
    <>
      <div className="hero-mini wrap">
        <div className="crumb"><Link to="/">{t("nav.home")}</Link> / {t("nav.about")}</div>
        <h1>{t("about.title")}</h1>
        <p style={{ maxWidth: "70ch", marginTop: 6 }}>{t("about.desc")}</p>
      </div>

      <section className="wrap about-section">
        {/* Featured: mission gets top billing, not just another card */}
        <div className="about-mission">
          <i className="fa-solid fa-location-dot about-mission-icon" aria-hidden="true"></i>
          <div>
            <h3>{t("about.c1t")}</h3>
            <p>{t("about.c1")}</p>
          </div>
        </div>

        <div className="about-grid">
          {cards.map((c, i) => (
            <div key={i} className="about-card">
              <i className={`fa-solid ${c.icon} about-card-icon`} aria-hidden="true"></i>
              <h4>{c.t}</h4>
              <p>{c.d}</p>
            </div>
          ))}

          {/* Privacy stands apart visually — it IS the "locked" section */}
          <div className="about-card about-card--secure">
            <i className="fa-solid fa-lock about-card-icon" aria-hidden="true"></i>
            <h4>{t("about.c4t")}</h4>
            <p>{t("about.c4")}</p>
          </div>
        </div>
      </section>
    </>
  );
}
// import { Link } from "react-router-dom";

// import { useLanguage } from "../i18n/LanguageContext";

// export default function About() {
//   const { t } = useLanguage();
//   const CARDS = [
//     { icon: "📍", t: t("about.c1t"), d: t("about.c1") },
//     { icon: "⚙", t: t("about.c2t"), d: t("about.c2") },
//     { icon: "🤝", t: t("about.c3t"), d: t("about.c3") },
//     { icon: "🔒", t: t("about.c4t"), d: t("about.c4") },
//   ];

//   return (
//     <>
//       <div className="hero-mini wrap">
//         <div className="crumb"><Link to="/">{t("nav.home")}</Link> / {t("nav.about")}</div>
//         <h1>{t("about.title")}</h1>
//         <p style={{ maxWidth: "70ch", marginTop: 6 }}>{t("about.desc")}</p>
//       </div>
//       <section className="wrap">
//         <div className="quick-actions" style={{ gridTemplateColumns: "repeat(2,1fr)" }}>
//           {CARDS.map((c, i) => (
//             <div key={i} className="qa-card" style={{ cursor: "default" }}>
//               <div className="icon" style={{ background: "var(--bg-subtle)" }}>{c.icon}</div>
//               <h4>{c.t}</h4>
//               <p>{c.d}</p>
//             </div>
//           ))}
//         </div>
//       </section>
//     </>
//   );
// } 
