import { devError } from "../utils/logger";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
// import { useData } from "../context/DataContext";
import CaseCard from "../components/CaseCard";
import FoundPersonCard from "../components/FoundPersonCard";
import { API_BASE } from "../api/apiClient";

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [myCases, setMyCases] = useState([]);
  const [myFounds, setMyFounds] = useState([]);

  useEffect(() => {
    const loadMyReports = async () => {
      try {
        const token = localStorage.getItem("token");

        const [missingRes, foundRes] = await Promise.all([
          fetch(`${API_BASE}/api/person/my-reports`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),

          fetch(`${API_BASE}/api/report/my-reports`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        const missingData = await missingRes.json();
        const foundData = await foundRes.json();

        if (missingRes.ok) {
          setMyCases(missingData);
        }

        if (foundRes.ok) {
          setMyFounds(foundData);
        }
      } catch (error) {
        devError("Dashboard error:", error);
      }
    };

    if (user) {
      loadMyReports();
    }
  }, [user]);

  const hasAny = myCases.length > 0 || myFounds.length > 0;
  return (
    <section className="wrap" style={{ paddingTop: 36, paddingBottom: 64 }}>
      <div className="dash-header">
        <div>
          <h1>{t("dashboard.title")}</h1>
          <p>{t("dashboard.desc")}</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link to="/report-missing" className="btn btn-primary btn-sm">{t("dashboard.reportMissingBtn")}</Link>
        </div>
      </div>

      {hasAny ? (
        <>
          <div className="dash-section">
            <h3>{t("dashboard.myMissing")}</h3>
            {myCases.length > 0 ? (
              <div className="case-grid">
                {myCases.map((c) => <CaseCard key={c._id} c={c} />)}
              </div>
            ) : (
              <div className="dash-empty" style={{ padding: 28 }}>{t("dashboard.noMissingYet")}</div>
            )}
          </div>
          <div className="dash-section">
            <h3>{t("dashboard.myFound")}</h3>
            {myFounds.length > 0 ? (
              <div className="found-grid">
                {myFounds.map((f) => <FoundPersonCard key={f._id} f={f} />)}
              </div>
            ) : (
              <div className="dash-empty" style={{ padding: 28 }}>{t("dashboard.noFoundYet")}</div>
            )}
          </div>
        </>
      ) : (
        <div className="dash-empty">
          <div className="ic">🗂</div>
          <p>{t("dashboard.empty")}</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <Link to="/report-missing" className="btn btn-primary btn-sm">{t("dashboard.reportMissingBtn")}</Link>
            <Link to="/report-found" className="btn btn-outline btn-sm">{t("hero.reportFound")}</Link>
          </div>
        </div>
      )}
    </section>
  );
}
