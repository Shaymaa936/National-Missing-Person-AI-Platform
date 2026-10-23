import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import QRCode from "qrcode";
import { API_BASE } from "../api/apiClient";
import "./MissingPoster.css";

// Printable A4 "MISSING / لاپتہ" poster with a QR code to the case page.
// Uses only public case info (backend already removes CNIC, contacts, FIR).

function splitDescription(description = "") {
  const marks = description.match(/\|\s*Marks:\s*(.*?)(?=\s*\|\s*Clothing:|$)/i)?.[1]?.trim();
  const clothing = description.match(/\|\s*Clothing:\s*(.*)$/i)?.[1]?.trim();
  const main = description.split("|")[0].trim();
  return { main, marks, clothing };
}

function photoUrl(person) {
  if (!person?.image) return "";
  if (person.image.startsWith("http")) return person.image;
  // private photo (family's choice): only works for police/admin/the family
  const token = localStorage.getItem("token");
  const tokenParam = person.photoPublic === false && token ? `?token=${token}` : "";
  return `${API_BASE}${person.image}${tokenParam}`;
}

export default function MissingPoster() {
  const { id } = useParams();
  const [person, setPerson] = useState(null);
  const [qr, setQr] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem("token");

    fetch(`${API_BASE}/api/person/${encodeURIComponent(id)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Case not found"))))
      .then(async (data) => {
        if (cancelled) return;
        setPerson(data);
        const caseUrl = `${window.location.origin}/missing-persons/${encodeURIComponent(data.caseId || id)}`;
        const dataUrl = await QRCode.toDataURL(caseUrl, {
          margin: 1,
          width: 320,
          errorCorrectionLevel: "M",
          color: { dark: "#0F172A", light: "#FFFFFF" },
        });
        if (!cancelled) setQr(dataUrl);
      })
      .catch((e) => !cancelled && setError(e.message));

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <div className="poster-page">
        <div className="poster-toolbar">
          <Link to="/missing-persons" className="btn btn-outline btn-sm">← Back</Link>
        </div>
        <p style={{ textAlign: "center", marginTop: 40 }}>{error}</p>
      </div>
    );
  }

  if (!person) {
    return <div className="poster-page"><p style={{ textAlign: "center", marginTop: 40 }}>Loading…</p></div>;
  }

  const { main, marks, clothing } = splitDescription(person.description || "");
  const photo = photoUrl(person);
  const lastSeen = person.lastSeenDate
    ? new Date(person.lastSeenDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "";
  const status = (person.status || "Missing").toLowerCase();

  return (
    <div className="poster-page">
      <div className="poster-toolbar">
        <Link to={`/missing-persons/${encodeURIComponent(person.caseId || id)}`} className="btn btn-outline btn-sm">
          ← Back to case
        </Link>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => window.print()}>
          <i className="fa-solid fa-print" aria-hidden="true" /> Print / Save as PDF
        </button>
      </div>

      <article className="poster">
        <header className="poster__head">
          <div className="poster__title">{status === "missing" ? "MISSING" : status === "found" ? "FOUND" : "CASE"}</div>
          <div className="poster__title-ur" dir="rtl" lang="ur">
            {status === "missing" ? "لاپتہ" : status === "found" ? "مل گیا" : "کیس"}
          </div>
        </header>

        <div className="poster__photo">
          {photo ? (
            <img src={photo} alt={person.name} />
          ) : (
            <div className="poster__nophoto">
              {person.limitedView
                ? "Photo hidden to protect the child — details are with police"
                : person.photoPublic === false
                ? "Photo kept private by the family"
                : "No photo available"}
            </div>
          )}
        </div>

        <h1 className="poster__name">{person.name}</h1>

        <dl className="poster__facts">
          {person.age ? (<><dt>Age · عمر</dt><dd>{person.age}</dd></>) : null}
          {person.gender ? (<><dt>Gender · جنس</dt><dd>{person.gender}</dd></>) : null}
          {person.lastSeenLocation ? (<><dt>Last seen · آخری بار</dt><dd>{person.lastSeenLocation}</dd></>) : null}
          {lastSeen ? (<><dt>Date · تاریخ</dt><dd>{lastSeen}</dd></>) : null}
          {marks ? (<><dt>Marks · نشانات</dt><dd>{marks}</dd></>) : null}
          {clothing ? (<><dt>Clothing · لباس</dt><dd>{clothing}</dd></>) : null}
        </dl>

        {main && main !== "—" && <p className="poster__desc">{main}</p>}

        <footer className="poster__foot">
          <div className="poster__call">
            <div className="poster__call-en">If you see this person, call <b>15</b></div>
            <div className="poster__call-ur" dir="rtl" lang="ur">اگر آپ نے اس شخص کو دیکھا ہے تو <b>15</b> پر کال کریں</div>
            <div className="poster__case">Case ID: <span>{person.caseId}</span></div>
          </div>
          <div className="poster__qr">
            {qr && <img src={qr} alt="QR code to the case page" />}
            <div>Scan to view &amp; send a tip</div>
            <div dir="rtl" lang="ur">اسکین کریں اور اطلاع دیں</div>
          </div>
        </footer>

        <div className="poster__brand">TraceAI · Missing persons platform</div>
      </article>
    </div>
  );
}
