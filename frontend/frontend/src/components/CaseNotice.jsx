import { useLanguage } from "../i18n/LanguageContext";
import "./CaseNotice.css";

// Banners on the case page: verified badge, pending / rejected notice
// (only family & staff can see unverified cases), and the child-privacy note.
export default function CaseNotice({ c }) {
  const { lang } = useLanguage();
  const ur = lang === "ur";
  if (!c) return null;

  const status = c.verificationStatus;

  return (
    <div className="case-notices">
      {status === "verified" && (
        <span className="case-verified">
          <i className="fa-solid fa-circle-check" aria-hidden="true" />{" "}
          {ur ? "تصدیق شدہ کیس" : "Verified case"}
        </span>
      )}

      {status === "pending" && (
        <div className="case-notice case-notice--pending" role="status">
          <b>⏳ {ur ? "تصدیق باقی ہے" : "Pending verification"}</b>
          <span>
            {ur
              ? "ابھی عوامی نہیں — صرف آپ، پولیس اور ایڈمن دیکھ سکتے ہیں۔ تصدیق کے لیے آپ سے رابطہ کیا جائے گا۔"
              : "Not public yet — only you, police and admins can see it. We will contact you to verify it."}
          </span>
        </div>
      )}

      {status === "rejected" && (
        <div className="case-notice case-notice--rejected" role="status">
          <b>{ur ? "تصدیق نہیں ہو سکی" : "Could not be verified"}</b>
          <span>
            {c.verificationNote ||
              (ur ? "مزید معلومات کے لیے ہم سے رابطہ کریں۔" : "Please contact us for more information.")}
          </span>
        </div>
      )}

      {c.limitedView && (
        <div className="case-notice case-notice--child" role="note">
          <b>🛡 {ur ? "بچے کی حفاظت کے لیے تفصیلات چھپائی گئی ہیں" : "Details hidden to protect the child"}</b>
          <span>
            {ur
              ? "تصویر اور مکمل تفصیل صرف پولیس کے پاس ہے۔ اگر آپ کے پاس کوئی معلومات ہے تو نیچے اطلاع دیں یا 15 پر کال کریں۔"
              : "Photo and full details are with police only. Have information? Send a tip below or call 15."}
          </span>
        </div>
      )}

      {c.isMinor && c.publicAlert && (
        <div className="case-notice case-notice--alert" role="note">
          <b>🚨 {ur ? "پولیس پبلک الرٹ" : "Police public alert"}</b>
          <span>
            {ur
              ? "پولیس نے اس بچے کی تفصیل عوام کے لیے جاری کی ہے۔ دیکھیں تو فوراً 15 پر کال کریں۔"
              : "Police have released this child's details to the public. If you see them, call 15 immediately."}
          </span>
        </div>
      )}
    </div>
  );
}
