// Cloudflare Turnstile (free CAPTCHA) check for public forms.
// Off until TURNSTILE_SECRET_KEY is set in .env, so nothing breaks before
// you create the free keys at dash.cloudflare.com -> Turnstile.
// The frontend sends the token in the "X-Turnstile-Token" header.

async function verifyTurnstile(req, res, next) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return next();

  const token = req.get("x-turnstile-token");
  if (!token) {
    return res.status(400).json({ message: "Please complete the security check (captcha)." });
  }

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (req.ip) body.append("remoteip", req.ip);

    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(8000),
    });
    const data = await response.json();

    if (data.success) return next();
    return res.status(400).json({ message: "Security check failed. Please try again." });
  } catch (error) {
    console.error("[turnstile] verification error:", error.message);
    return res.status(503).json({ message: "Security check unavailable. Please try again in a moment." });
  }
}

module.exports = verifyTurnstile;
