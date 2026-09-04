import { Link } from "react-router-dom";
import { fmtDate } from "../data/mockData";
import { useLanguage } from "../i18n/LanguageContext";

/**
 * Person-found card. Unlike CaseCard, the photo here is NEVER
 * blurred and the page is fully open to visitors without signing in —
 * per spec, found-person photos are public.
 */
export default function FoundPersonCard({ f }) {
  const { t, lang } = useLanguage();

  return (
    <Link
      to={`/person-found/${f.id}`}
      className="found-card"
      style={{ display: "block" }}
    >
      <div className="photo">
        <img src={f.photo} alt="Unidentified person" />
      </div>

      <div className="body">
        <span
          className={`badge ${
            f.longLost ? "badge-investigating" : "badge-tip"
          }`}
          style={{
            marginBottom: 8,
            display: "inline-block",
          }}
        >
          {f.longLost
            ? t("found.longLost")
            : t("found.recentlyFound")}
        </span>

        <h4 style={{ fontSize: 16 }}>
          {t("found.unidentified")}
        </h4>

        <p
          style={{
            fontSize: 13,
            margin: "6px 0",
          }}
        >
          {f.gender === "male"
            ? t("common.male")
            : t("common.female")}
        </p>

        {/* Age information */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            fontSize: 13,
            margin: "4px 0 10px",
          }}
        >
          <span>
            <strong>{t("found.currentAge")}:</strong>{" "}
            {f.currentAge ?? "—"}
          </span>

         

          <span>
            <strong>{t("found.ageWhenLost")}:</strong>{" "}
            {f.ageWhenLost ?? "—"}
          </span>
        </div>

        <p
          style={{
            fontSize: 12.5,
            color: "var(--text-supporting)",
            margin: "0 0 8px",
          }}
        >
          {t("found.foundLocation")}: {f.foundLocation} ·{" "}
          {fmtDate(f.foundDate, lang)}
        </p>

        <div
          className="caseid"
          style={{ marginTop: 8 }}
        >
          {f.caseId ||
            (f.id &&
            !String(f.id).match(/^[0-9a-fA-F]{24}$/)
              ? f.id
              : `FP-2026-${String(f.id)
                  .slice(-4)
                  .toUpperCase()}`)}
        </div>
      </div>
    </Link>
  );
}