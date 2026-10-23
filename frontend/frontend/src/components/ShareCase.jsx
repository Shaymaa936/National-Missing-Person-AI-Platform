import { useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";
import { API_BASE } from "../api/apiClient";
import "./ShareCase.css";

// WhatsApp / Facebook / copy-link / poster buttons for a missing-person case.
// The shared link goes through /share/:caseId on the backend, so WhatsApp and
// Facebook show a preview with the photo and name.
export default function ShareCase({ caseId, name, location }) {
  const { lang } = useLanguage();
  const [copied, setCopied] = useState(false);

  if (!caseId) return null;

  const base = API_BASE || window.location.origin;
  const link = `${base}/share/${encodeURIComponent(caseId)}`;
  const ur = lang === "ur";
  const message = ur
    ? `لاپتہ: ${name}${location && location !== "—" ? ` — آخری بار ${location} میں دیکھا گیا` : ""}۔ براہ کرم مدد کریں، تفصیل دیکھیں یا اطلاع دیں: ${link}`
    : `MISSING: ${name}${location && location !== "—" ? ` — last seen at ${location}` : ""}. Please help: view details or send a tip: ${link}`;

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(message)}`;
  const facebook = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(ur ? "لنک کاپی کریں:" : "Copy this link:", link);
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title: `MISSING: ${name}`, text: message, url: link });
    } catch {
      /* user closed the share sheet */
    }
  }

  return (
    <div className="share-case">
      <div className="share-case__title">
        {ur ? "شیئر کریں — ہر شیئر مدد ہے" : "Share — every share helps"}
      </div>

      <div className="share-case__buttons">
        <a className="share-btn share-btn--whatsapp" href={whatsapp} target="_blank" rel="noopener noreferrer">
          <i className="fa-brands fa-whatsapp" aria-hidden="true" /> WhatsApp
        </a>
        <a className="share-btn share-btn--facebook" href={facebook} target="_blank" rel="noopener noreferrer">
          <i className="fa-brands fa-facebook-f" aria-hidden="true" /> Facebook
        </a>
        <button type="button" className="share-btn share-btn--copy" onClick={copyLink}>
          <i className={`fa-solid ${copied ? "fa-check" : "fa-link"}`} aria-hidden="true" />{" "}
          {copied ? (ur ? "کاپی ہو گیا" : "Copied") : ur ? "لنک کاپی" : "Copy link"}
        </button>
        {typeof navigator !== "undefined" && navigator.share && (
          <button type="button" className="share-btn share-btn--copy" onClick={nativeShare}>
            <i className="fa-solid fa-share-nodes" aria-hidden="true" /> {ur ? "مزید" : "More"}
          </button>
        )}
      </div>

      <Link className="share-btn share-btn--poster" to={`/missing-persons/${encodeURIComponent(caseId)}/poster`}>
        <i className="fa-solid fa-print" aria-hidden="true" /> {ur ? "پوسٹر پرنٹ کریں (QR کوڈ کے ساتھ)" : "Print poster with QR code"}
      </Link>
    </div>
  );
}
