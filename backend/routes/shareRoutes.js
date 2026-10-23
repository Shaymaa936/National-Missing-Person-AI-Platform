const express = require("express");
const MissingPerson = require("../models/MissingPerson");
const { isMinor, firstName, cityOnly } = require("../utils/casePrivacy");

const router = express.Router();

// Escape text before putting it inside HTML (stops script injection through
// a case name or description)
function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Public website address. Set PUBLIC_SITE_URL in .env (e.g. https://trace.pk);
// otherwise it uses the address the request came in on.
function siteUrl(req) {
  return (process.env.PUBLIC_SITE_URL || `${req.protocol}://${req.get("host")}`).replace(/\/+$/, "");
}

// GET /share/:caseId
// The link people share on WhatsApp / Facebook. Their preview bot reads the
// og: tags (photo, name, last seen); a real visitor is sent straight to the
// case page. Only public info is used — never CNIC, contacts or FIR.
router.get("/:caseId", async (req, res) => {
  const base = siteUrl(req);
  const caseId = String(req.params.caseId || "").slice(0, 40);

  try {
    const person = await MissingPerson.findOne({ caseId }).select(
      "caseId name age gender lastSeenLocation lastSeenDate image photoPublic status verificationStatus publicAlert"
    );

    // unverified cases are not public: nothing to preview
    if (!person || person.verificationStatus !== "verified") {
      return res.redirect(302, `${base}/missing-persons`);
    }

    // children without a police public alert: first name + city only, no photo
    const childLimited = isMinor(person) && !person.publicAlert;
    if (childLimited) {
      person.name = firstName(person.name);
      person.lastSeenLocation = cityOnly(person.lastSeenLocation);
      person.image = "";
    }

    const target = `${base}/missing-persons/${encodeURIComponent(person.caseId)}`;
    const prefix =
      person.status === "Missing" ? (childLimited ? "MISSING CHILD" : "MISSING") : person.status === "Found" ? "FOUND" : "CASE";
    const title = `${prefix}: ${person.name}${person.age && !childLimited ? `, ${person.age}` : ""}`;
    const seenDate = person.lastSeenDate
      ? new Date(person.lastSeenDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
      : "";
    const description = [
      person.lastSeenLocation ? `Last seen: ${person.lastSeenLocation}` : "",
      seenDate ? `on ${seenDate}` : "",
      "· Recognise them? Tap to view and send a tip. If seen, call 15.",
    ]
      .filter(Boolean)
      .join(" ");
    const image =
      person.image && person.photoPublic !== false ? `${base}${person.image}` : `${base}/icons/icon-512.png`;

    res.set("Cache-Control", "public, max-age=300");
    res.type("html").send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(title)} | TraceAI</title>
<meta name="description" content="${esc(description)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="TraceAI">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:url" content="${esc(target)}">
<meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0;url=${esc(target)}">
</head>
<body>
<p><a href="${esc(target)}">${esc(title)} — open case</a></p>
<script>location.replace(${JSON.stringify(target)})</script>
</body>
</html>`);
  } catch (error) {
    console.error("[share] error:", error.message);
    res.redirect(302, `${base}/missing-persons`);
  }
});

module.exports = router;
