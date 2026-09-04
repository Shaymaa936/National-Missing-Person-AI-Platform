import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";


/**
 * Public navbar.
 * - No admin link anywhere (see README) — admin only reachable at /admin/login.
 * - The old primary "Report a Person" button has been swapped for "Sign Up"
 *   per spec — reporting still happens from the Home quick-actions and the
 *   footer, but the navbar's primary call-to-action is now account creation.
 * - EN/UR language toggle restored (top-right, next to auth actions).
 */
export default function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();

  return (
    <header className="nav">
      <div className="nav-inner">
        <NavLink to="/" className="logo">
         <img src="/TraceAI logo.png" alt="Trace" className="mark" />
          TraceAI
        </NavLink>
        <nav className="nav-links">
          <NavLink to="/">{t("nav.home")}</NavLink>
          <NavLink to="/missing-persons">{t("nav.missing")}</NavLink>
          <NavLink to="/person-found">{t("nav.found")}</NavLink>
          <NavLink to="/guide">{t("nav.guide")}</NavLink>
          <NavLink to="/contact">{t("nav.contact")}</NavLink>
          <NavLink to="/about">{t("nav.about")}</NavLink>
        </nav>
        <div className="nav-actions">
          <div className="lang-switch">
            <button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>EN</button>
            <button className={lang === "ur" ? "active" : ""} onClick={() => setLang("ur")}>اردو</button>
          </div>
          {isAuthenticated ? (
            <>
              <NavLink to="/dashboard" className="btn btn-outline btn-sm">
                {t("dashboard.title")}
              </NavLink>
              <button className="btn btn-ghost btn-sm" onClick={logout}>{t("dashboard.logout")}</button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="btn btn-outline btn-sm">{t("nav.login")}</NavLink>
              <NavLink to="/signup" className="btn btn-primary btn-sm">{t("nav.signup")}</NavLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
