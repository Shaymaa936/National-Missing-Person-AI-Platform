import { useLanguage } from "../i18n/LanguageContext";

export default function StatusBadge({ status }) {
  const { t } = useLanguage();
  const label = t("status." + status);
  const cls = status === "unmatched" ? "active" : status === "matched" ? "found" : status;
  return <span className={`badge badge-${cls}`}>{label}</span>;
}
