import { useLanguage } from "../i18n/LanguageContext";

/**
 * Missing-person photo. Photos are public now (anyone can recognise the
 * person and send a tip); private details are hidden by the backend.
 * Shows a neutral placeholder when there is no photo.
 * (File name kept so existing imports keep working.)
 */
export default function BlurGate({ src, alt = "", onUnlockedClick, className = "", privatePhoto = false, childProtected = false }) {
  const { lang } = useLanguage();
  const noPhotoText = childProtected
    ? (lang === "ur" ? "بچے کی حفاظت کے لیے تصویر پوشیدہ" : "Photo hidden to protect the child")
    : privatePhoto
    ? (lang === "ur" ? "خاندان کی درخواست پر تصویر پوشیدہ ہے" : "Photo kept private by the family")
    : (lang === "ur" ? "تصویر دستیاب نہیں" : "No photo available");

  return (
    <div className={`blur-gate ${className}`} onClick={(e) => onUnlockedClick?.(e)}>
      {src ? (
        <img src={src} alt={alt} />
      ) : (
        <div className="lock-overlay lock-overlay--solid">
          <span className="icn">{childProtected ? "🛡" : privatePhoto ? "🔒" : "👤"}</span>
          <span>{noPhotoText}</span>
        </div>
      )}
    </div>
  );
}
