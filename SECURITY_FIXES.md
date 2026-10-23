# Security fixes (Oct 2026)

Nothing in the frontend changed. All existing features keep working.

## Backend (`backend/`)

| Fix | File |
| --- | --- |
| Contact messages: only staff can read/update/delete (before: any signed-up user) | `routes/contactRoutes.js` |
| Login/signup/tips: inputs forced to strings, blocks NoSQL injection like `{"$ne": null}` | `controllers/authController.js`, `controllers/tipController.js` |
| Signup validation: valid email, password ≥ 8 chars, CNIC 13 digits (dashes optional) | `controllers/authController.js` |
| `reporter` and `tipster` keep the dashboard but no longer see CNIC / family contacts / FIR | `middleware/authMiddleware.js`, `controllers/personController.js`, `controllers/faceMatchController.js` |
| Public pages no longer return reporter email or finder phone/name | `controllers/personController.js`, `controllers/reportController.js` |
| Role and suspended status read from the database on every request (incl. photos) | `middleware/optionalAuth.js`, `middleware/authMiddleware.js` |
| Audit log actor comes from the logged-in account, not the request body | `controllers/auditController.js` |
| Re-running AI scans no longer resets Confirmed/Rejected matches to Pending; no duplicate matches | `controllers/faceMatchController.js`, `controllers/reportController.js` |
| Confirming a match adds an "AI match confirmed" timeline entry | `controllers/faceMatchController.js` |
| AI never suggests a male for a female (or reverse). "Other"/unknown still matches. Re-scans remove old Pending male↔female suggestions; Confirmed/Rejected are kept | `utils/matchFilters.js` (new), `controllers/faceMatchController.js`, `controllers/reportController.js` |
| Found-report update only accepts known fields (no setting `image` to a remote URL) | `controllers/reportController.js` |
| Deleting a found report also deletes its photo file | `controllers/reportController.js` |
| Upload path traversal (`../`) blocked | `middleware/upload.js` |
| Security headers (nosniff, no framing, no-referrer), optional CORS allow-list | `server.js` |
| Rate limits on signup (20 / 15 min) and contact form (10 / 15 min) | `server.js` |
| Removed duplicate fields in the MissingPerson schema; fixed global `dns` variable | `models/MissingPerson.js`, `server.js` |

## Roles: 8 → 4

| Role | Dashboard | Sees CNIC / family contact / FIR | Review actions (case status, approve reports & tips, run single AI scan, confirm/reject matches) | Delete, Run-all scan, Users & Roles, Audit log |
| --- | --- | --- | --- | --- |
| `admin` | Yes | Yes | Yes | Yes |
| `police` | Yes | Yes | Yes | No |
| `ngo` | Yes (view) | No | No | No |
| `user` | No | Only on their own reports | No | No |

Old accounts are converted automatically on server start (`backend/utils/migrateRoles.js`): `investigator` → `police`; `dpo`, `reporter`, `tipster` → `ngo`. An admin can upgrade anyone from Users & Roles. People already logged in with an old role are mapped in the frontend too, so nobody is locked out.

Police can now actually use the buttons the dashboard already showed them (before, the backend rejected them). Buttons an NGO can't use are hidden.

## Public case pages, private details

- Missing-person photos and case pages are public: anyone can open a case and send a tip without signing in.
- CNIC, family contact, FIR number/scan and reporter email are still removed by the backend for everyone except police, admin and the person who filed the report. The FIR row shows "Restricted (police only)".
- FIR scans (`/uploads/fir`) still need login.
- Missing-person photo URLs no longer carry the login token.
- **Photo consent:** Report Missing has a checkbox "Show this photo publicly" (ticked by default, EN + Urdu). If the family unticks it, the photo is shown only to police, admin and the reporter, even through a direct URL (`middleware/missingPhotoGuard.js`). AI matching still uses it. Existing cases stay public (`photoPublic` defaults to `true`).

## New features

| Feature | What it does | Files |
| --- | --- | --- |
| CNIC: one account per CNIC | Signup rejects a CNIC already registered (any format). Stored as xxxxx-xxxxxxx-x. Form checks the format before submit | `authController.js`, `Signup.jsx` |
| NADRA-ready verification | Every account has a CNIC status (Pending / Verified / Failed). Set `NADRA_API_URL` + `NADRA_API_KEY` and adapt `services/nadraService.js` to NADRA's spec; until then an admin marks it verified by clicking the badge in Users & Roles | `services/nadraService.js`, `User.js`, `AdminDashboard.jsx` |
| Duplicate case detection | When a missing case is filed, its photo is checked against open cases (same gender, similarity ≥ `DUPLICATE_THRESHOLD`, default 0.7). Matches are saved on the case, noted on its timeline, shown to the family on the success screen and as a warning in the admin case modal | `personController.js`, `ReportMissing.jsx`, `CaseDetailModal.jsx` |
| Email notifications | Family contact + reporter get an email when a case is filed (with case ID), when an AI match is confirmed, and when a tip on their case is approved. Optional: set `SMTP_*` in `.env`; without it nothing breaks | `services/notifyService.js` (needs `npm install` for nodemailer) |
| Tips: phone + verified badge | Tip form has an optional phone number (only police/admin see it). Tips from logged-in accounts show "✔ Verified account" in the admin tips list | `Tip.js`, `tipController.js`, `MissingPersonDetail.jsx`, `AdminDashboard.jsx` |
| Gender must be chosen | Both report forms start on "Select gender" (required), so the gender filter never works on a wrong default | `ReportMissing.jsx`, `ReportFound.jsx` |
| AI accuracy script | `python evaluate.py dataset/` prints false-match and missed-match rates per threshold and suggests one — use the numbers on your pitch slide | `face_dtc/face_dtc/evaluate.py` |

| CNIC auto-format | CNIC fields (Signup, Report Missing, FIR auto-fill) add dashes while typing: digits only, max 13 → `35202-1234567-1` | `utils/cnic.js`, `Signup.jsx`, `ReportMissing.jsx` |
| UI polish (same colours) | Orange focus ring on inputs, hover states, disabled buttons, card hover lift, styled consent box, duplicate warning, CNIC badge, orange checkboxes, keyboard focus outlines | `index.css` (section "UI POLISH" at the end) |

| Photo location data removed | Every upload (missing photo, FIR scan, found photo) is re-saved: GPS location, date and phone model removed, photo turned upright, max 1600px. Files that aren't real images are rejected | `middleware/stripImageMetadata.js` (needs `sharp`, installed by `npm install`) |
| Face engine self-heal on a new server | "Run AI Scan on All" re-enrolls any case whose face isn't on the current engine (e.g. after moving from laptop to VPS) | `services/faceMatchService.js`, `controllers/faceMatchController.js` |
| VPS deployment guide | Step-by-step setup: VPS size, Nginx, HTTPS, systemd service for the face engine, pm2, backups, troubleshooting | `DEPLOY.md`, `deploy/` |

| Share buttons | Case page has WhatsApp, Facebook, Copy link (and phone share sheet) buttons. Links go through `/share/<caseId>` so WhatsApp/Facebook show a preview with photo, name and last-seen place (only public info; private photos never used) | `components/ShareCase.jsx/.css`, `routes/shareRoutes.js` |
| Missing poster + QR | "Print poster with QR code" opens an A4 poster (MISSING / لاپتہ, photo, details, call 15, QR to the case page). Print or save as PDF; fits one page | `pages/MissingPoster.jsx/.css` (uses the small `qrcode` package) |
| Installable app (PWA) | Site can be installed on phones ("Add to Home screen"), has an app icon and an offline page. Case data and photos are never cached | `public/manifest.webmanifest`, `public/sw.js`, `public/offline.html`, `public/icons/` |
| Blurry photo warning | Report Missing / Report Found show "photo looks blurry" or "photo looks clear" right after choosing a photo (checked in the browser, never blocks) | `components/PhotoQualityHint.jsx/.css`, `utils/photoQuality.js` |
| Better face detector (optional) | `FACE_DETECTOR=retinaface` (after `pip install retina-face`) finds side faces, children and low-light faces better; falls back to OpenCV automatically | `face_engine.py` |
| Captcha (Cloudflare Turnstile, free) | Signup, tips, contact form and found reports. Off until you add keys: `VITE_TURNSTILE_SITE_KEY` (frontend) + `TURNSTILE_SECRET_KEY` (backend) | `components/Turnstile.jsx`, `middleware/verifyTurnstile.js` |

| Splash works offline | The splash animation player is bundled with the site instead of being downloaded from a CDN, so the intro shows even with slow/no internet | `components/SplashScreen.jsx` |

**After pulling these changes run `npm install` in `backend/`** (adds nodemailer and sharp) and in `frontend/frontend/` (adds qrcode).

## Verification & child safety

| Rule | Details |
| --- | --- |
| New cases start **Pending verification** | Not in the public list, share links or posters until police/admin verify. Family and staff dashboards still see it. AI face matching starts immediately, privately. |
| First 24 hours (no FIR yet) | Families can report without an FIR. Police/admin verify by phone call, documents, FIR or police station (method is recorded, note stays private). Family can **Add FIR** later from My Dashboard. |
| Relationship | "Your relationship to the missing person" is required. |
| B-form | Required for under-18 cases (13 digits, auto dashes). Police/admin only. |
| 3 reports per day | Each account can file max 3 missing reports in 24 hours. Admin and police are not limited. |
| Children (under 18, or unknown age) | Public sees first name, city, age, gender and date only — no photo, description or timeline — unless police turn on **Public alert**. |
| Tips are private | Public sees that tips exist, never their text, place or name. Police/admin and the family see full tips. |
| Existing cases | Marked verified once on server start so the site isn't empty; admin/police can move any back to pending (Undo). |

Files: `backend/utils/casePrivacy.js`, `backend/middleware/dailyReportLimit.js`, `backend/utils/migrateCases.js`, `controllers/personController.js` (verify, public alert, add FIR), `controllers/tipController.js`, `routes/personRoutes.js`, `routes/tipRoutes.js`, `routes/shareRoutes.js`, `models/MissingPerson.js`, `config/db.js`; frontend `components/CaseNotice`, `components/admin/CaseVerifyControls`, `components/CaseVerificationStatus`, `utils/relationships.js`, report form, case page, cards, admin table, user dashboard.

## Premium CSS
Appended to `index.css` ("PREMIUM THEME"). The glass Track Your Case card, glass stats and the hero video overlay are untouched. Also fixed a stray `;` in `index.css` (the old build warning) and added the Inter font in `index.html`.

## Face engine (`face_dtc/face_dtc/`)

| Fix | File |
| --- | --- |
| Optional shared secret: set `FACE_ENGINE_SECRET` and every request needs `X-Engine-Key`; `/data`, `/static`, `/sdk` stop being served | `app.py` |
| Each face vector is tagged with its model; Facenet and colour-histogram vectors are never compared | `face_engine.py`, `db_manager.py` |
| Old records are auto-detected (histogram vs Facenet) | `db_manager.py` |
| Relaxed second face-detection pass for small faces | `face_engine.py` |
| `FACE_STRICT_MODE=1`: refuse colour fallback, reject photos with no face | `face_engine.py`, `app.py` |
| Safe JSON writes (lock + temp file) | `db_manager.py` |
| Host/port/reload from env (`FACE_HOST`, default `127.0.0.1`; reload off) | `app.py` |

`.gitignore` now excludes face photos and `missing_db.json`.

## Steps to do yourself

1. **Set the shared secret.** Put the same long random value as `FACE_ENGINE_SECRET` in `backend/.env` and in the face engine's environment, then restart both.
2. **Turn on strict mode** once `/api/health` shows `"deepface_available": true`: set `FACE_STRICT_MODE=1` for the engine.
3. **Set `CORS_ORIGINS`** in `backend/.env` to your frontend URL.
4. **Firewall port 8000** on the VPS (e.g. `sudo ufw deny 8000`) so only the backend reaches it.
5. **HTTPS:** point a domain at the VPS and run `sudo certbot --nginx`.
6. **Remove face data from GitHub:** `git rm -r --cached face_dtc/face_dtc/data/faces face_dtc/face_dtc/data/missing_db.json face_dtc/face_dtc/data/faces_db.json`, commit, push. (Older commits still contain it; clean history with `git filter-repo` if needed.)
7. **Clear demo cases** ("Sarah Connor", duplicate "Ali Hmaza") from the admin panel so Mongo and the engine stay in sync.

New signups need passwords of at least 8 characters; existing accounts are not affected.
