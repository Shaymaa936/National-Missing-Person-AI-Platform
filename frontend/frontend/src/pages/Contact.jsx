import { devError } from "../utils/logger";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";
import { API_BASE } from "../api/apiClient";

export default function Contact() {
  const { t } = useLanguage();

  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setSent(false);

    const form = e.target;

    const name = form.elements.name.value.trim();
    const email = form.elements.email.value.trim();
    const phone = form.elements.phone.value.trim();
    const message = msg.trim();

    // Check all fields
    if (!name || !email || !phone || !message) {
      setError("Please fill in all fields.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE}/api/contact`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            phone,
            message,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to send message");
      }

      // Success
      setSent(true);
      setMsg("");

      // Reset form
      form.reset();
    } catch (error) {
      devError("Contact API Error:", error);
      setError(
        error.message || "Unable to connect to server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* =========================
          PAGE HEADER
      ========================== */}
      <div className="hero-mini wrap">
        <div className="crumb">
          <Link to="/">{t("nav.home")}</Link> /{" "}
          {t("nav.contact")}
        </div>

        <h1>{t("contact.title")}</h1>
      </div>

      {/* =========================
          CONTACT SECTION
      ========================== */}
      <section className="wrap">
        <div
          className="hero-grid"
          style={{ alignItems: "start" }}
        >
          {/* =========================
              CONTACT FORM
          ========================== */}
          <div className="form-section">
            <h3>{t("contact.title")}</h3>

            <p className="hint">
              {t("contact.desc")}
            </p>

            <form onSubmit={handleSubmit}>
              <div
                className="form-grid"
                style={{ marginTop: 14 }}
              >
                {/* NAME */}
                <div className="field">
                  <label>{t("contact.name")}</label>

                  <input
                    type="text"
                    name="name"
                    required
                  />
                </div>

                {/* EMAIL */}
                <div className="field">
                  <label>{t("contact.email")}</label>

                  <input
                    type="email"
                    name="email"
                    required
                  />
                </div>

                {/* PHONE */}
                <div className="field full">
                  <label>{t("contact.phone")}</label>

                  <input
                    type="tel"
                    name="phone"
                    required
                  />
                </div>

                {/* MESSAGE */}
                <div className="field full">
                  <label>{t("contact.message")}</label>

                  <textarea
                    name="message"
                    value={msg}
                    onChange={(e) => setMsg(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* ERROR MESSAGE */}
              {error && (
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
                  {error}
                </div>
              )}

              {/* SUBMIT BUTTON */}
              <button
                className="btn btn-primary"
                style={{ marginTop: 16 }}
                type="submit"
                disabled={loading}
              >
                {loading ? "Sending..." : t("contact.submit")}
              </button>
            </form>

            {/* SUCCESS MESSAGE */}
            {sent && (
              <div
                className="track-result found"
                style={{ marginTop: 14 }}
              >
                {t("contact.sent")}
              </div>
            )}
          </div>

          {/* =========================
              EMERGENCY CONTACTS
          ========================== */}
          <div
            className="form-section"
            style={{
              background: "#FFF7ED",
              borderColor: "var(--emergency)",
            }}
          >
            <h4>{t("contact.emergTitle")}</h4>

            {/* POLICE */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom:
                  "1px solid var(--border)",
              }}
            >
              <span>{t("contact.police")}</span>
              <b>15</b>
            </div>

            {/* EDHI */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom:
                  "1px solid var(--border)",
              }}
            >
              <span>{t("contact.edhi")}</span>
              <b>115</b>
            </div>

            {/* CITIZENS PORTAL */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 0",
              }}
            >
              <span>{t("contact.citizen")}</span>
              <b>1099</b>
            </div>

            {/* RESCUE */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom:
                  "1px solid var(--border)",
              }}
            >
              <span>Rescue Service</span>
              <b>1122</b>
            </div>

            {/* EMERGENCY NOTE */}
            <p
              style={{
                fontSize: 12,
                marginTop: 12,
              }}
            >
              {t("contact.emergNote")}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}