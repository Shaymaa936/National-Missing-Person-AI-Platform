import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import { useData } from "../context/DataContext";
import CaseCard from "../components/CaseCard";
import FoundPersonCard from "../components/FoundPersonCard";
import { API_BASE } from "../api/apiClient";
import heroVideo from '../assets/video/LandingPage.mp4';


export default function Home() {
  const { isAuthenticated } = useAuth();
  

  const { t } = useLanguage();
  const navigate = useNavigate();
  const { cases, founds } = useData();
  const [trackId, setTrackId] = useState("");
  const [trackResult, setTrackResult] = useState(null);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactMsg, setContactMsg] = useState("");
  const [contactSent, setContactSent] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState("");

  const active = cases.filter((c) => c.status !== "found").length;
  const reunited = cases.filter((c) => c.status === "found").length;
  const tips = cases.reduce((sum, c) => sum + (Array.isArray(c.tips) ? c.tips.length : 0), 0);
  const publicFounds = founds.filter((f) => f.status !== "pending");

  function handleReportMissing(e) {
    if (!isAuthenticated) {
      e.preventDefault();
      navigate("/login");
    }
  }

  function doTrack() {
    const val = trackId.trim().toUpperCase();
    if (!val) { setTrackResult(null); return; }
    const found =
      cases.find((c) =>
        String(c.id || "").toUpperCase() === val ||
        String(c.caseId || "").toUpperCase() === val ||
        String(c._id || "").toUpperCase() === val
      ) ||
      founds.find((f) =>
        String(f.id || "").toUpperCase() === val ||
        String(f.caseId || "").toUpperCase() === val ||
        String(f._id || "").toUpperCase() === val
      );
    setTrackResult(found ? { ok: true, item: found } : { ok: false });
  }

  async function handleContactSubmit(e) {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactPhone.trim() || !contactMsg.trim()) {
      setContactError("Please fill in all fields.");
      return;
    }
    setContactError("");
    setContactLoading(true);
    setContactSent(false);

    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: contactName.trim(),
          email: contactEmail.trim(),
          phone: contactPhone.trim(),
          message: contactMsg.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to send message");
      }

      setContactSent(true);
      setContactName("");
      setContactEmail("");
      setContactPhone("");
      setContactMsg("");
    } catch (err) {
      console.error("Home Contact Error:", err);
      setContactError(err.message || "Failed to send message");
    } finally {
      setContactLoading(false);
    }
  }

  return (
    <>
      <section className="hero hero-slideshow">
        <div className="hero-slides">
          <div className="hero-slides">
          <video className="hero-video" autoPlay muted loop playsInline>
        <source src={heroVideo} type="video/mp4" />
      </video>
        </div>
        </div>
        <div className="hero-overlay" />
        <div className="wrap hero-grid">
          <div>
          
            <h1>{t("hero.h1")}</h1>
            <p className="lead">{t("hero.lead")}</p>
            <div className="hero-cta">
              <Link to="/report-missing" className="btn btn-primary" onClick={handleReportMissing}>
                {t("hero.reportMissing")}
              </Link>
              <Link to="/report-found" className="btn btn-ghost">{t("hero.reportFound")}</Link>
            </div>

            <div className="stat-row">
              <div className="stat"><span className="num">{active}</span><span className="lbl">{t("hero.statActive")}</span></div>
              <div className="stat"><span className="num">{reunited}</span><span className="lbl">{t("hero.statReunited")}</span></div>
              <div className="stat"><span className="num">{tips}</span><span className="lbl">{t("hero.statTips")}</span></div>
            </div>
          </div>
          <div className="track-card">
            <h3>{t("hero.trackTitle")}</h3>
            <p style={{ marginTop: 6 }}>{t("hero.trackDesc")}</p>
            <div className="track-input-row">
              <input
                placeholder={t("hero.trackPlaceholder")}
                value={trackId}
                onChange={(e) => setTrackId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doTrack()}
              />
              <button className="btn btn-secondary btn-sm" onClick={doTrack}>{t("hero.trackBtn")}</button>
            </div>
            {trackResult && (
              trackResult.ok ? (
                <div className="track-result found">
                  <strong>{trackResult.item.id}</strong> — case found.{" "}
                  {trackResult.item.name ? (
                    <Link to={isAuthenticated ? `/missing-persons/${trackResult.item.id}` : "/login"}>View case →</Link>
                  ) : (
                    <Link to={`/person-found/${trackResult.item.id}`}>View case →</Link>
                  )}
                </div>
              ) : (
                <div className="track-result notfound">{t("hero.trackNotFound")}</div>
              )
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="section-head">
            <div>
              <h2>{t("section.recentCases")}</h2>
              <p>{t("section.recentDesc")}</p>
            </div>
            <Link to="/missing-persons" className="btn btn-outline btn-sm">{t("nav.missing")} →</Link>
          </div>
          <div className="case-grid">
            {cases.slice(0, 4).map((c) => <CaseCard key={c.id} c={c} />)}
          </div>
        </div>
      </section>

      {publicFounds.length > 0 && (
        <section className="section-tinted">
          <div className="wrap">
            <div className="section-head">
              <div>
                <h2>{t("section.foundTitle")}</h2>
                <p>{t("section.foundDesc")}</p>
              </div>
              <Link to="/person-found" className="btn btn-outline btn-sm">{t("nav.found")} →</Link>
            </div>
            <div className="found-grid">
              {publicFounds.slice(0, 4).map((f) => <FoundPersonCard key={f.id} f={f} />)}
            </div>
          </div>
        </section>
      )}

      <section id="contact">
        <div className="wrap">
          <div className="section-head">
            <div>
              <h2>{t("contact.title")}</h2>
              <p>{t("contact.desc")}</p>
            </div>
          </div>
          <div className="hero-grid" style={{ alignItems: "start", gap: 32 }}>
            <div className="form-section">
              <form onSubmit={handleContactSubmit}>
                <div className="form-grid">
                  <div className="field">
                    <label>{t("contact.name")}</label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="field">
                    <label>{t("contact.email")}</label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="field full">
                    <label>{t("contact.phone")}</label>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      required
                    />
                  </div>
                  <div className="field full">
                    <label>{t("contact.message")}</label>
                    <textarea
                      value={contactMsg}
                      onChange={(e) => setContactMsg(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {contactError && (
                  <div
                    style={{
                      marginTop: 14,
                      padding: "10px 12px",
                      borderRadius: 8,
                      background: "#FEE2E2",
                      color: "#B91C1C",
                      fontSize: 14,
                    }}
                  >
                    {contactError}
                  </div>
                )}

                <button
                  className="btn btn-primary"
                  style={{ marginTop: 16 }}
                  type="submit"
                  disabled={contactLoading}
                >
                  {contactLoading ? "Sending..." : t("contact.submit")}
                </button>
              </form>
              {contactSent && <div className="track-result found" style={{ marginTop: 14 }}>{t("contact.sent")}</div>}
            </div>
            <div className="form-section" style={{ background: "#FFF7ED", borderColor: "var(--emergency)" }}>
              <h4>{t("contact.emergTitle")}</h4>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}><span>{t("contact.police")}</span><b>15</b></div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}><span>{t("contact.edhi")}</span><b>115</b></div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0" }}><span>{t("contact.citizen")}</span><b>1099</b></div>
              <p style={{ fontSize: 12, marginTop: 14, color: "var(--text-supporting)" }}>{t("contact.emergNote")}</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}