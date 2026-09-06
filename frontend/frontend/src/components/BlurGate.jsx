import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";

/**
 * Wraps a missing-person photo. The backend never sends the real photo
 * URL to a logged-out visitor (see personController.js), so when `src`
 * is empty we just show the lock overlay — there's no real image to blur.
 * Signed-in users get the real `src` and see the photo normally.
 */
export default function BlurGate({ src, alt = "", onUnlockedClick, className = "" }) {
  const { isAuthenticated } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const lockText = lang === "ur" ? "تصویر دیکھنے کے لیے سائن اِن کریں" : "Sign in to view this photo";

  function handleClick(e) {
    if (!isAuthenticated) {
      e.preventDefault();
      e.stopPropagation();
      navigate("/login");
      return;
    }
    onUnlockedClick?.(e);
  }

  return (
    <div className={`blur-gate ${className}`} onClick={handleClick}>
      {isAuthenticated && src ? (
        <img src={src} alt={alt} />
      ) : (
        <div className="lock-overlay lock-overlay--solid">
          <span className="icn">🔒</span>
          <span>{lockText}</span>
        </div>
      )}
    </div>
  );
}