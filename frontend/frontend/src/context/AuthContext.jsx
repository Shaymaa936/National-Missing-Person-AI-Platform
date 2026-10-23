import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { API_BASE } from "../api/apiClient";

const AuthContext = createContext(null);

// Reads a JSON reply; if the server sent nothing / not JSON (backend not
// running, wrong address), gives a clear message instead of
// "Unexpected end of JSON input".
async function readJson(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

function serverError(response) {
  return new Error(
    `Can't reach the server (${response.status}). Check that the backend is running and VITE_API_URL in frontend/.env is correct.`
  );
}

// Old role names -> new 4 roles (same mapping as backend/utils/migrateRoles.js),
// so people already logged in with an old role aren't locked out.
const LEGACY_ROLE_MAP = { investigator: "police", dpo: "ngo", reporter: "ngo", tipster: "ngo" };
function withCurrentRole(u) {
  if (u && LEGACY_ROLE_MAP[u.role]) return { ...u, role: LEGACY_ROLE_MAP[u.role] };
  return u;
}

// Reads the expiry time from the JWT. The token lasts 1 day; after that,
// protected photos return 401 and look "missing" while the UI still shows
// the user as logged in. We use this to log the user out on expiry instead.
function getTokenExpiry(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
  const token = localStorage.getItem("token");
  const savedUser = localStorage.getItem("user");
  
  if (!token || !savedUser) {
    return null;
  }

  // Expired login: clear it so the user signs in again
  const expiry = getTokenExpiry(token);
  if (expiry && expiry <= Date.now()) {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    return null;
  }

  try {
    return withCurrentRole(JSON.parse(savedUser));
  } catch {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    return null;
  }
});

  const login = useCallback(async (email, password) => {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await readJson(response);

    if (!data) throw serverError(response);

    if (!response.ok) {
      throw new Error(data.message || "Login failed");
    }

    // Save JWT
    localStorage.setItem("token", data.token);

    // Save complete user including role
    localStorage.setItem("user", JSON.stringify(data.user));

    setUser(data.user);

    return data;
  }, []);

const signup = useCallback(
  async (name, email, password, cnic, phone, captchaToken = "") => {
    const response = await fetch(
     `${API_BASE}/api/auth/signup`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(captchaToken ? { "X-Turnstile-Token": captchaToken } : {}),
        },
        body: JSON.stringify({
          name,
          email,
          password,
          cnic,
          phone,
        }),
      }
    );

    const data = await readJson(response);

    if (!data) throw serverError(response);

    if (!response.ok) {
      throw new Error(data.message || "Signup failed");
    }

    // Save JWT if backend returns one
    if (data.token) {
      localStorage.setItem("token", data.token);
    }

    // Save user
    localStorage.setItem("user", JSON.stringify(data.user));

    // Update auth state
    setUser(data.user);

    return data;
  },
  []
);
  

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  // Log out automatically the moment the token expires
  useEffect(() => {
    if (!user) return;

    const expiry = getTokenExpiry(localStorage.getItem("token") || "");
    if (!expiry) return;

    const timer = setTimeout(logout, Math.max(0, expiry - Date.now()));
    return () => clearTimeout(timer);
  }, [user, logout]);

  const value = {
    user,
    isAuthenticated: !!user,

    login,
    signup,
    logout,

    // IMPORTANT
    isAdminAuthenticated: user?.role === "admin",
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return ctx;
}