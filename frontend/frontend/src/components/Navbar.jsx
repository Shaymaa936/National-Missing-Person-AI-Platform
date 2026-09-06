import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";


export default function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="nav">
      <div className="nav-inner">
        <NavLink to="/" className="logo" onClick={closeMenu}>
         <img src="/TraceAI logo.png" alt="Trace" className="mark" />
          TraceAI
        </NavLink>

        <button
          className="nav-toggle"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div className={`nav-collapse${menuOpen ? " open" : ""}`}>
          <nav className="nav-links">
            <NavLink to="/" onClick={closeMenu}>{t("nav.home")}</NavLink>
            <NavLink to="/missing-persons" onClick={closeMenu}>{t("nav.missing")}</NavLink>
            <NavLink to="/person-found" onClick={closeMenu}>{t("nav.found")}</NavLink>
            <NavLink to="/guide" onClick={closeMenu}>{t("nav.guide")}</NavLink>
            <NavLink to="/contact" onClick={closeMenu}>{t("nav.contact")}</NavLink>
            <NavLink to="/about" onClick={closeMenu}>{t("nav.about")}</NavLink>
          </nav>
          <div className="nav-actions">
            <div className="lang-switch">
              <button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>EN</button>
              <button className={lang === "ur" ? "active" : ""} onClick={() => setLang("ur")}>اردو</button>
            </div>
            {isAuthenticated ? (
              <>
                <NavLink to="/dashboard" className="btn btn-outline btn-sm" onClick={closeMenu}>
                  {t("dashboard.title")}
                </NavLink>
                <button className="btn btn-ghost btn-sm" onClick={() => { logout(); closeMenu(); }}>{t("dashboard.logout")}</button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="btn btn-outline btn-sm" onClick={closeMenu}>{t("nav.login")}</NavLink>
                <NavLink to="/signup" className="btn btn-primary btn-sm" onClick={closeMenu}>{t("nav.signup")}</NavLink>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}