# GAIA — Restaurant Waiter & Food Rating Web App (PRD)

## Original Problem Statement
Modern, mobile-responsive "Classic 5-Star Restaurant Waiter & Food Rating Web App" for high-end Dubai restaurants. Single-page app. English default with smooth Arabic/RTL toggle. Classic Google-Maps-style 5-star rating (no emojis, gold when selected). Three views in one page: Customer, Owner Dashboard (Staff Login → password "1234"), and a master kill-switch suspended notice. On submit: 4–5★ opens a Google Maps review tab; 1–3★ stays on page, saves locally, and shows a Thank-You popup. Production-grade upgrade: hide platform branding, email manager on low ratings via Resend, 15-min spam protection, printable QR code, easy-fork config block, customizable typography.

## Architecture
- **Frontend**: React 19 SPA, Tailwind, lucide-react, react-router-dom (for `/qr` route)
- **Backend**: FastAPI + Mongo + Resend (transactional email)
- **Email**: Resend Python SDK, async via `asyncio.to_thread` to keep FastAPI non-blocking
- **Rate limiting**: dual-layer
  - Server: per-IP 15-min sliding window (in-memory; move to Redis if scaling)
  - Client: `localStorage` key `gaia_last_alert_v1`
- **Storage**:
  - `localStorage.gaia_reviews_v1` — all submitted reviews
  - `localStorage.gaia_lang_v1` — language preference
  - `localStorage.gaia_last_alert_v1` — last low-rating alert timestamp
  - Mongo `alerts` collection — server-side audit trail of low-rating alerts

## Global Configuration Block (top of `App.js`)
```js
const RESTAURANT_NAME = "GAIA";
const GOOGLE_MAPS_REVIEW_URL = "https://search.google.com/local/writereview?placeid=YOUR_PLACE_ID";
const MANAGER_EMAIL = "manager@gaia.ae";       // Display only — real send uses backend ENV
let isAccountActive = true;                    // Master kill-switch
let enableArabic = true;                       // Hide AR toggle if false
```

Backend env (`backend/.env`):
```
RESEND_API_KEY=re_your_api_key_here
SENDER_EMAIL=onboarding@resend.dev
MANAGER_EMAIL=manager@gaia.ae
RESTAURANT_NAME=GAIA
```

## Typography Customization
All typography lives in CSS variables at the top of `/app/frontend/src/index.css` — change font families, weights, sizes, and tracking in one place:
- `--font-display-en`, `--font-display-ar`, `--font-body-en`, `--font-body-ar`
- `--display-weight`, `--brand-size-mobile`, `--brand-size-desktop`, `--brand-tracking`
- `--label-size`, `--label-tracking`, `--btn-size`, `--btn-tracking`, etc.

## API Endpoints
- `GET /api/config` → `{restaurant_name, manager_email, rate_limit_window_seconds, email_configured}`
- `POST /api/alerts/low-rating` body `{rating(1-3), waiter_name, comment, language}`
  - 200 on success: `{status, email_sent, email_id?}`
  - 400 if rating ≥ 4
  - 429 if rate-limited (`retry_after_seconds`)

## What's Been Implemented
### Phase 1 — MVP (2026-02-28)
- Premium light luxury UI (Cormorant Garamond + Cairo/Tajawal, gold #D4AF37 accents).
- Bilingual EN/AR toggle with persisted preference and RTL flip.
- Six-waiter selection with grey vector avatars.
- Classic SVG 5-star rating with hover preview.
- Submit routing: 4–5★ → Google Maps tab; 1–3★ → in-app Thank-You modal + local save.
- Hidden Staff Login → password modal → Owner Dashboard with stats, per-waiter breakdown, recent feedback list, logout.
- Bilingual Suspended View triggered by `isAccountActive=false`.

### Phase 2 — Production upgrade (2026-02-28)
- **Hidden Emergent badge** via `display:none / visibility:hidden / opacity:0 / pointer-events:none` inline + `#emergent-badge` CSS rule. "Made with Emergent" text is not visibly rendered.
- **Service Recovery Email Alert** via Resend backend endpoint `POST /api/alerts/low-rating` (sent when rating < 4). Beautiful HTML email containing Rating (stars + numeric), Waiter Name, and Guest Comment.
- **Spam protection** (15-min sliding window) at both client (`localStorage`) and server (per-IP in-memory dict). User sees a polished bilingual "Just a moment" modal when limited.
- **Printable QR code** in two places:
  - **Owner Dashboard** — embedded compact QR card with Print / Copy Link / Open Standalone buttons
  - **/qr standalone route** — full-page printable version with Back link and `@media print` styles
  - QR rendered via `api.qrserver.com` (no dependency install needed)
- **Global config block** at top of `App.js` for easy fork (RESTAURANT_NAME, GOOGLE_MAPS_REVIEW_URL, MANAGER_EMAIL, isAccountActive, enableArabic).
- **Typography fully customizable** via CSS variables in `index.css`.
- **E2E tested** (testing_agent_v3): Backend 5/5 + Frontend 14/14 scenarios PASS.

## Backlog / Next Tasks
**P0 — before launch**
- Set real `RESEND_API_KEY` in `backend/.env` (Resend dashboard → API Keys).
- Set `SENDER_EMAIL` to a Resend-verified domain (e.g., `alerts@yourdomain.com`).
- Replace `GOOGLE_MAPS_REVIEW_URL` placeholder with the actual GAIA Dubai Place ID URL.

**P1**
- Move server-side rate limit store to Redis (currently in-memory; resets on backend restart, single-replica only).
- CSV export of reviews from dashboard.

**P2**
- Email digest of all daily reviews (not just low-rating alerts).
- Web-push notification fallback for the manager.
- Multi-restaurant support (workspace + table-level QR codes per table).
- Self-host QR generation via `qrcode` npm package (no external dependency).

## Test Credentials
- Staff dashboard password: `1234`
