import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import { formatCnic } from "../utils/cnic";
import Turnstile, { TURNSTILE_ENABLED } from "../components/Turnstile";

export default function Signup() {
  const { signup } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cnic, setCnic] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [captchaKey, setCaptchaKey] = useState(0);

  async function handleSubmit(e) {
  e.preventDefault();
  setError("");

  if (password !== confirmPassword) {
    setError("Passwords do not match.");
    return;
  }

  if (TURNSTILE_ENABLED && !captcha) {
    setError("Please complete the security check.");
    return;
  }

  try {
    await signup(name, email, password, cnic, phone, captcha);
    const dest = location.state?.from?.pathname || "/dashboard";
    navigate(dest, { replace: true });
  } catch (err) {
    setError(err.message || "Signup failed.");
    setCaptchaKey((k) => k + 1);
  }
}

  return (
    <section className="wrap" style={{ paddingTop: 56, paddingBottom: 56 }}>
      <div className="auth-shell">
        <h2>{t("auth.signupTitle")}</h2>
        <p>{t("auth.signupDesc")}</p>
        <form onSubmit={handleSubmit}>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>{t("auth.fullName")}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>{t("auth.email")}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-grid" style={{ marginBottom: 14 }}>
            <div className="field">
              <label>{t("auth.cnic")}</label>
              <input
                placeholder="xxxxx-xxxxxxx-x"
                value={cnic}
                onChange={(e) => setCnic(formatCnic(e.target.value))}
                inputMode="numeric"
                autoComplete="off"
                maxLength={15}
                required
                pattern="\d{5}-\d{7}-\d"
                title="13-digit CNIC, e.g. 35202-1234567-1"
              />
            </div>
            <div className="field">
              <label>{t("auth.phone")}</label>
              <input placeholder="03xx-xxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
          </div>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>{t("auth.password")}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} title="At least 8 characters" />
          </div>
          <div className="field" style={{ marginBottom: 6 }}>
            <label>{t("auth.confirmPw")}</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>
          <Turnstile onToken={setCaptcha} resetKey={captchaKey} />
          {error && <p style={{ color: "var(--emergency)", fontSize: 12.5, margin: "8px 0" }}>{error}</p>}
          <p style={{ fontSize: 11.5, color: "var(--text-supporting)", marginTop: 10 }}>
            🔒 CNIC is required (one account per CNIC) to stop fake reports. It is kept private, never shown
            publicly, and is verified with NADRA.
          </p>
          <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} type="submit">{t("auth.signupBtn")} →</button>
        </form>
        <div className="auth-switch">{t("auth.haveAccount")} <Link to="/login">{t("auth.loginLink")}</Link></div>
      </div>
    </section>
  );
}
