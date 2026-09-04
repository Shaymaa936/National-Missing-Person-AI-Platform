import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";
import { useData } from "../context/DataContext";
import FoundPersonCard from "../components/FoundPersonCard";

/**
 * Person Found page has two parameters/categories, per spec:
 *  - "found":    someone who was recently found by another person (longLost === false)
 *  - "longLost": a long-lost person, missing for a long time (longLost === true)
 *
 * Photos on this whole page are public — never blurred, no sign-in required.
 * Reports are only shown here once an admin has approved them.
 */
export default function PersonFound() {
  const { t } = useLanguage();
  const { founds: allFounds } = useData();
  const [tab, setTab] = useState("all"); // all | found | longLost

  const founds = useMemo(() => allFounds.filter((f) => f.status !== "pending"), [allFounds]);

  const list = useMemo(() => {
    if (tab === "found") return founds.filter((f) => !f.longLost);
    if (tab === "longLost") return founds.filter((f) => f.longLost);
    return founds;
  }, [tab, founds]);

  return (
    <>
      <div className="hero-mini wrap">
        <div className="crumb"><Link to="/">{t("nav.home")}</Link> / {t("nav.found")}</div>
        <h1>{t("nav.found")}</h1>
        <p style={{ maxWidth: "60ch", marginTop: 6 }}>{t("section.foundDesc")}</p>
      </div>
      <section className="wrap">
        <div className="found-tabs">
          <button className={tab === "all" ? "active" : ""} onClick={() => setTab("all")}>{t("found.all")} ({founds.length})</button>
          <button className={tab === "found" ? "active" : ""} onClick={() => setTab("found")}>
            {t("found.recentlyFound")} ({founds.filter((f) => !f.longLost).length})
          </button>
          <button className={tab === "longLost" ? "active" : ""} onClick={() => setTab("longLost")}>
            {t("found.longLost")} ({founds.filter((f) => f.longLost).length})
          </button>
        </div>
        {list.length ? (
          <div className="found-grid">{list.map((f) => <FoundPersonCard key={f.id} f={f} />)}</div>
        ) : (
          <div className="dash-empty">{t("empty")}</div>
        )}
      </section>
    </>
  );
}
