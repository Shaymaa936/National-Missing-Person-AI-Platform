import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import { daysBetween } from "../data/mockData";
import BlurGate from "./BlurGate";
import StatusBadge from "./StatusBadge";
import { API_BASE } from "../api/apiClient";

function getCasePhoto(c) {
  const token = localStorage.getItem("token");
  const tokenParam = token ? `?token=${token}` : "";

  if (c?.image) {
    return c.image.startsWith("http")
      ? c.image
      : `${API_BASE}${c.image}${tokenParam}`;
  }

  if (c?.photo) {
    return c.photo.startsWith("http")
      ? c.photo
      : `${API_BASE}${c.photo}${tokenParam}`;
  }

  return "";
}

function getCaseStatus(status) {
  if (status?.toLowerCase() === "missing") return "active";

  return status?.toLowerCase() || "active";
}

export default function CaseCard({ c }) {
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // MongoDB uses _id or caseId
  const rawId = c?._id || c?.id;
  const displayCaseId =
    c?.caseId ||
    (c?.id && !String(c.id).match(/^[0-9a-fA-F]{24}$/)
      ? c.id
      : rawId
      ? `MP-2026-${String(rawId).slice(-4).toUpperCase()}`
      : "—");

  // Backend uses lastSeenDate
  const lastSeen = c?.lastSeenDate || c?.lastSeen;

  const location =
    c?.lastSeenLocation ||
    c?.city ||
    c?.location ||
    "—";

  const photo = getCasePhoto(c);
  const status = getCaseStatus(c?.status);

  const days = daysBetween(lastSeen);

  function openCase() {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (rawId) {
      navigate(`/missing-persons/${rawId}`);
    }
  }

  return (
    <div className="case-card" onClick={openCase}>

      <div className="photo">

        <BlurGate
          src={photo}
          alt={c?.name || "Missing person"}
          onUnlockedClick={openCase}
        />

       

        <span className="stampwrap">
          <StatusBadge status={status} />
        </span>

      </div>

      <div className="body">

        <h4>
          {c?.name || "Unnamed"}
        </h4>

        <div className="meta">

          <span>
            Age: {c?.age ?? "—"} · {c?.gender || "—"}
          </span>

          <span>
            Last seen: {location}
          </span>

        </div>

        <span className="days">
          {days} {t("card.daysMissing")}
        </span>

        <div className="caseid">
          {displayCaseId}
        </div>

      </div>

      <div className="actions">

        <button
          className="btn btn-outline btn-sm btn-block"
          onClick={(e) => {
            e.stopPropagation();
            openCase();
          }}
        >
          {t("card.viewCase")}
        </button>

      </div>

    </div>
  );
}