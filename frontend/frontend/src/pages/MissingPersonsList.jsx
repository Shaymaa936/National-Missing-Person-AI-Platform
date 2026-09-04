import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";
import { daysBetween } from "../data/mockData";
import { useData } from "../context/DataContext";
import CaseCard from "../components/CaseCard";

export default function MissingPersonsList() {
  const { t } = useLanguage();
  const { cases } = useData();
  const [q, setQ] = useState("");
  const [gender, setGender] = useState("");
  const [city, setCity] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("recent");

  const cities = useMemo(() => [...new Set(cases.map((c) => c.city))], [cases]);

  const list = useMemo(() => {
    let filtered = cases.filter((c) => {
      if (q && !(c.name.toLowerCase().includes(q.toLowerCase()) || c.id.toLowerCase().includes(q.toLowerCase()))) return false;
      if (gender && c.gender !== gender) return false;
      if (city && c.city !== city) return false;
      if (status && c.status !== status) return false;
      return true;
    });
    if (sort === "urgent") {
      const order = { active: 0, investigating: 1, tip: 2, found: 3 };
      filtered = [...filtered].sort((a, b) => order[a.status] - order[b.status] || daysBetween(b.lastSeen) - daysBetween(a.lastSeen));
    } else if (sort === "longest") {
      filtered = [...filtered].sort((a, b) => daysBetween(b.lastSeen) - daysBetween(a.lastSeen));
    } else {
      filtered = [...filtered].sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));
    }
    return filtered;
  }, [cases, q, gender, city, status, sort]);

  return (
    <>
      <div className="hero-mini wrap">
        <div className="crumb"><Link to="/">{t("nav.home")}</Link> / {t("nav.missing")}</div>
        <h1>{t("nav.missing")}</h1>
      </div>
      <section className="wrap">
        <div className="filters-bar">
          <div className="field"><label>{t("filters.search")}</label><input placeholder={`${t("filters.name")} / ID`} value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div className="field">
            <label>{t("filters.gender")}</label>
            <select value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">{t("filters.any")}</option><option value="male">{t("common.male")}</option><option value="female">{t("common.female")}</option>
            </select>
          </div>
          <div className="field">
            <label>{t("filters.city")}</label>
            <select value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">{t("filters.any")}</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label>{t("filters.status")}</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">{t("filters.all")}</option>
              {["active", "tip", "investigating", "found"].map((s) => <option key={s} value={s}>{t("status." + s)}</option>)}
            </select>
          </div>
          <div className="field">
            <label>{t("filters.sort")}</label>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="recent">{t("filters.sortRecent")}</option>
              <option value="urgent">{t("filters.sortUrgent")}</option>
              <option value="longest">{t("filters.sortLongest")}</option>
            </select>
          </div>
          <button className="btn btn-secondary btn-sm">{t("filters.search")}</button>
        </div>
        {list.length ? (
          <div className="case-grid">{list.map((c) => <CaseCard key={c.id} c={c} />)}</div>
        ) : (
          <div className="dash-empty">{t("empty")}</div>
        )}
      </section>
    </>
  );
}
