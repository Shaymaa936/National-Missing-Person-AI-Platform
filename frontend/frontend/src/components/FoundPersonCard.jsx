import { useNavigate } from "react-router-dom";
import { fmtDate } from "../data/mockData";
import { useLanguage } from "../i18n/LanguageContext";
import { foundDisplayName, genderLabel } from "../utils/personDisplay";
import "./CaseCard.css";

/**
 * Person-found card — same layout as the missing-person CaseCard.
 * Found-person photos are public (never blurred).
 */
export default function FoundPersonCard({ f }) {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  const caseId =
    f.caseId ||
    (f.id && !String(f.id).match(/^[0-9a-fA-F]{24}$/)
      ? f.id
      : `FP-2026-${String(f.id || f._id).slice(-4).toUpperCase()}`);

  const name = foundDisplayName(f, t);
  const open = () => navigate(`/person-found/${f.id}`);

  return (
    <div className="case-card found-card-v2" onClick={open}>
      <div className="photo">
        {f.photo ? (
          <img src={f.photo} alt={name} />
        ) : (
          <div className="found-card-v2__nophoto">👤</div>
        )}
        <span className="stampwrap">
          <span className={`badge ${f.longLost ? "badge-investigating" : "badge-tip"}`}>
            {f.longLost ? t("found.longLost") : t("found.recentlyFound")}
          </span>
        </span>
      </div>

      <div className="body">
        <h4>{name}</h4>

        <div className="meta">
          <span>
            {lang === "ur" ? "عمر" : "Age"}: {f.currentAge ?? "—"}
            {f.ageWhenLost != null && f.ageWhenLost !== "" ? ` (${lang === "ur" ? "لاپتہ ہوتے وقت" : "when lost"} ${f.ageWhenLost})` : ""}
            {" · "}
            {genderLabel(f.gender, t)}
          </span>
          <span>
            {t("found.foundLocation")}: {f.foundLocation || "—"}
          </span>
        </div>

        <span className="found-card-v2__date">
          {t("found.foundDate")}: {fmtDate(f.foundDate, lang)}
        </span>

        <div className="caseid">{caseId}</div>
      </div>

      <div className="actions">
        <button
          type="button"
          className="btn btn-outline btn-sm btn-block"
          onClick={(e) => {
            e.stopPropagation();
            open();
          }}
        >
          {lang === "ur" ? "تفصیل دیکھیں" : "View details"}
        </button>
      </div>
    </div>
  );
}
