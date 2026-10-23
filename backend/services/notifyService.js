// Email notifications to the family. Optional: if SMTP isn't configured
// (or nodemailer isn't installed) it only logs and never breaks a request.
//
// backend/.env:
//   SMTP_HOST=smtp.gmail.com   SMTP_PORT=465
//   SMTP_USER=you@gmail.com    SMTP_PASS=<app password>
//   SMTP_FROM="TraceAI <you@gmail.com>"
const MissingPerson = require("../models/MissingPerson");
const User = require("../models/User");

let transporter = null;

function getTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null;
  if (transporter) return transporter;
  try {
    const nodemailer = require("nodemailer");
    const port = Number(process.env.SMTP_PORT || 465);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    return transporter;
  } catch (err) {
    console.error("[notify] nodemailer not installed (run npm install):", err.message);
    return null;
  }
}

async function sendEmail(to, subject, text) {
  const t = getTransporter();
  if (!t || !to || !to.length) {
    console.log(`[notify] email skipped (${!t ? "SMTP not configured" : "no recipient"}): ${subject}`);
    return false;
  }
  try {
    await t.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
    });
    return true;
  } catch (err) {
    console.error("[notify] email failed:", err.message);
    return false;
  }
}

// Emails the family contact on the case + the account that filed it
async function notifyCaseFamily(personId, subject, lines) {
  try {
    const person = await MissingPerson.findById(personId).select(
      "name caseId contactEmail reportedBy"
    );
    if (!person) return false;

    const emails = new Set();
    if (person.contactEmail) emails.add(person.contactEmail.trim().toLowerCase());
    if (person.reportedBy) {
      const reporter = await User.findById(person.reportedBy).select("email");
      if (reporter?.email) emails.add(reporter.email.trim().toLowerCase());
    }

    const text = [
      `Case ${person.caseId} — ${person.name}`,
      "",
      ...lines,
      "",
      "TraceAI never asks for money. If anyone contacts you asking for payment, report it to police (15).",
      "— TraceAI team",
    ].join("\n");

    return sendEmail([...emails], `TraceAI: ${subject} (${person.caseId})`, text);
  } catch (err) {
    console.error("[notify] notifyCaseFamily failed:", err.message);
    return false;
  }
}

module.exports = { sendEmail, notifyCaseFamily };
