import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer>
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <h5>TraceAI</h5>
            <p>{t("footer.tagline")}</p>
          </div>
          <div>
            <h5>{t("footer.quick")}</h5>
            <div className="footer-flinks">
              <Link to="/missing-persons">{t("nav.missing")}</Link>
              <Link to="/report-missing">{t("hero.reportMissing")}</Link>
              <Link to="/report-found">{t("hero.reportFound")}</Link>
            </div>
          </div>
          <div>
            <h5>{t("footer.resources")}</h5>
            <div className="footer-flinks">
              <Link to="/guide">{t("nav.guide")}</Link>
              <Link to="/about">{t("nav.about")}</Link>
              <Link to="/contact">{t("nav.contact")}</Link>
            </div>
          </div>
          <div>
            <h5>{t("footer.legal")}</h5>
            <div className="footer-flinks">
              <span>{t("footer.privacy")}</span>
              <span>{t("footer.terms")}</span>
              <span>{t("footer.disclaimer")}</span>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 TraceAI </span>
          <span>{t("footer.rights")}</span>
        </div>
      </div>
    </footer>
  );
}
