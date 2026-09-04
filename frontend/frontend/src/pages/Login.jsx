import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";


/**
 * Public-site login. This is what CaseCard / BlurGate / RequireAuth /
 * the navbar all redirect to. On success we send the visitor back to
 * wherever they were headed (location.state.from), or the dashboard.
 */
export default function Login() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); // Added loading state
  const [error, setError] = useState("");         // Added error state

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");      // Clear any previous error
    setLoading(true);  // Disable button while processing

   try {
  const data = await login(email, password);

  console.log("LOGIN RESPONSE:", data);
  console.log("LOGIN ROLE:", data.user?.role);

  if (data.user?.role === "user") {
    // Normal user
    navigate("/dashboard", { replace: true });
  } else {
    // All staff roles: admin, dpo, police, investigator, reporter, tipster, ngo
    navigate("/admin/dashboard", { replace: true });
  }
}
     catch (error) {
      console.error("LOGIN ERROR:", error);
      setError(error.message || "Something went wrong"); // Set error text instead of alert
    } finally {
      setLoading(false); // Re-enable button
    }
  }
  

  return (
    <section className="wrap" style={{ paddingTop: 56, paddingBottom: 56 }}>
      <div className="auth-shell">
        <h2>{t("auth.loginTitle")}</h2>
        <p>{t("auth.loginDesc")}</p>
        
        {/* Error message card */}
        {error && (
          <div className="alert alert-danger" style={{ color: "red", marginBottom: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>{t("auth.email")}</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              disabled={loading} // Prevent editing while loading
              required
            />
          </div>
          <div className="field" style={{ marginBottom: 6 }}>
            <label>{t("auth.password")}</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              disabled={loading} // Prevent editing while loading
              required
            />
          </div>
          <button 
            className="btn btn-primary btn-block" 
            style={{ marginTop: 18 }} 
            type="submit"
            disabled={loading} // Disable button to prevent double submission
          >
            {loading ? t("auth.loading") || "Loading..." : `${t("auth.loginBtn")} →`}
          </button>
        </form>
        <div className="auth-switch">{t("auth.noAccount")} <Link to="/signup">{t("auth.signupLink")}</Link></div>
      </div>
    </section>
  );
}
