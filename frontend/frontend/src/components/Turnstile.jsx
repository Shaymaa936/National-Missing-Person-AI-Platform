import { useEffect, useRef } from "react";

// Cloudflare Turnstile (free CAPTCHA). Shows nothing until
// VITE_TURNSTILE_SITE_KEY is set in frontend/.env.
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";
export const TURNSTILE_ENABLED = !!SITE_KEY;

let scriptPromise = null;
function loadScript() {
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

/**
 * <Turnstile onToken={setCaptcha} resetKey={n} />
 * onToken gets the token (or "" when it expires). Change resetKey after each
 * submit to get a fresh token (tokens work only once).
 */
export default function Turnstile({ onToken, resetKey = 0 }) {
  const boxRef = useRef(null);
  const widgetRef = useRef(null);

  useEffect(() => {
    if (!SITE_KEY) return undefined;
    let cancelled = false;
    onToken?.("");

    loadScript()
      .then(() => {
        if (cancelled || !boxRef.current || !window.turnstile) return;
        widgetRef.current = window.turnstile.render(boxRef.current, {
          sitekey: SITE_KEY,
          callback: (token) => onToken?.(token),
          "expired-callback": () => onToken?.(""),
          "error-callback": () => onToken?.(""),
        });
      })
      .catch(() => onToken?.(""));

    return () => {
      cancelled = true;
      if (widgetRef.current && window.turnstile) {
        window.turnstile.remove(widgetRef.current);
        widgetRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  if (!SITE_KEY) return null;
  return <div ref={boxRef} style={{ margin: "12px 0" }} />;
}
