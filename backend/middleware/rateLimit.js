// Simple in-memory rate limiter (no extra package needed).
// Limits how many requests one IP can make in a time window, so the chatbot
// (Groq credits), login, and public forms can't be spammed.
function rateLimit({
  windowMs = 60 * 1000,
  max = 30,
  message = "Too many requests. Please try again later."
} = {}) {
  const hits = new Map();

  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.reset <= now) hits.delete(key);
    }
  }, windowMs);
  if (cleanup.unref) cleanup.unref();

  return (req, res, next) => {
    const key = req.ip || req.socket?.remoteAddress || "unknown";
    const now = Date.now();

    let entry = hits.get(key);
    if (!entry || entry.reset <= now) {
      entry = { count: 0, reset: now + windowMs };
      hits.set(key, entry);
    }

    entry.count++;

    if (entry.count > max) {
      res.set("Retry-After", String(Math.ceil((entry.reset - now) / 1000)));
      return res.status(429).json({ message });
    }

    next();
  };
}

module.exports = rateLimit;
