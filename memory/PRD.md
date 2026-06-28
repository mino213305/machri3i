# GAIA — Restaurant Waiter & Food Rating Web App (PRD)

## Original Problem Statement
Modern, mobile-responsive "Classic 5-Star Restaurant Waiter & Food Rating Web App" for high-end Dubai restaurants. Single-page app. English default with a smooth Arabic/RTL toggle. Classic Google-Maps-style 5-star rating (no emojis, gold when selected). Three views in one page: Customer, Owner Dashboard (Staff Login → password "1234"), and a master kill-switch suspended notice. On submit: 4–5★ opens a Google Maps review tab; 1–3★ stays on page, saves locally, and shows a Thank-You popup.

## User Choices
- Restaurant name: **GAIA**
- Storage: **browser localStorage** (no backend)
- Staff password: **1234**
- Sample waiter names accepted (Ahmed, Omar, Sara, Layla, Khalid, Mariam)

## Architecture
- **Frontend-only React SPA** (no backend used for this app)
- **Tech**: React 19, Tailwind CSS, lucide-react icons
- **Fonts**: Cormorant Garamond + Manrope (EN), Cairo + Tajawal (AR)
- **Persistence**: `localStorage` keys
  - `gaia_reviews_v1` — array of `{ id, waiterId, rating, feedback, createdAt }`
  - `gaia_lang_v1` — `"en" | "ar"`
- **Master controller**: `const isAccountActive = true;` at top of `App.js`. Flip to `false` to render full-screen suspended notice (bilingual).
- **Google Maps redirect URL**: `GOOGLE_MAPS_REVIEW_URL` constant at top of `App.js` (currently placeholder — must be replaced with real GAIA Dubai Place ID URL).

## User Personas
- **Diner (Customer)** — sits at table, scans QR / opens link, picks waiter, rates, optionally comments, submits.
- **Owner / Manager** — opens hidden Staff Login at page bottom, enters PIN, reviews analytics per waiter.
- **Operator (admin)** — flips `isAccountActive` flag to suspend service when needed.

## Core Requirements (static)
1. English as default language; elegant `عربي` toggle that fully flips UI to RTL Arabic.
2. Classic 5-star Google Maps style rating (pure SVG, gold `#D4AF37` fill).
3. Waiter selection grid with round grey vector avatar placeholders.
4. Optional feedback textarea (bilingual placeholders).
5. Smart routing on submit:
   - **4–5★** → `window.open` Google Maps review URL in new tab.
   - **1–3★** → in-app Thank-You modal, persist locally.
6. Hidden "Staff Login" link → password modal (password `1234`) → Owner Dashboard.
7. Owner Dashboard: total reviews, average rating, waiters tracked, per-waiter breakdown table, recent feedback list, logout. Bilingual.
8. Master kill-switch: `isAccountActive=false` shows full-screen elegant bilingual suspended notice.
9. Mobile-responsive premium aesthetic (Dubai 5-star feel).

## Files
- `/app/frontend/src/App.js` — single-file app: `App`, `CustomerView`, `OwnerDashboard`, `SuspendedView`, `LanguageToggle`, `PasswordModal`, `ThankYouModal`, `StarRating`, `WaiterAvatar`.
- `/app/frontend/src/i18n.js` — `translations` (en/ar) + `waiters` array.
- `/app/frontend/src/index.css` — design tokens + fade-up / modal animations + RTL font swap.
- `/app/frontend/public/index.html` — Google Fonts preconnect & link.

## What's Been Implemented — 2026-02-28
- Premium light luxury UI (Cormorant Garamond display + Manrope UI; Cairo/Tajawal for AR).
- Bilingual EN ↔ AR toggle with `<html dir>` and font swap, persisted to localStorage.
- Six-waiter grid with circular `User` vector avatars and gold selected state.
- Classic SVG 5-star rating with hover preview and click-to-set.
- Feedback textarea with bilingual placeholders.
- Submit logic with validation (waiter + rating required), localStorage persistence, smart routing (4–5★ opens GMaps in new tab; 1–3★ shows Thank-You modal).
- Hidden Staff Login link → custom-styled password modal → Owner Dashboard.
- Owner Dashboard: 3 stat cards, per-waiter breakdown with 1–5★ distribution, recent feedback table, logout. Bilingual.
- Suspended view (`isAccountActive=false`) with bilingual elegant message.
- Full-screen E2E testing via testing_agent_v3: **100% pass on all 11 scenarios**.

## Backlog / Next Tasks
**P0**
- Replace `GOOGLE_MAPS_REVIEW_URL` placeholder with real GAIA Dubai Place ID URL.

**P1**
- Add QR code generator page for printing table tents.
- Export dashboard data (CSV download) for the owner.
- Add a "table number" optional field for sharper analytics.

**P2**
- Sync reviews to a backend (FastAPI + Mongo) so multiple devices share data.
- Add per-day / per-week filter on dashboard.
- Add owner-facing alerts for any 1–2★ review (email or SMS).
- Image / dish rating extension.

## Test Credentials
- Staff dashboard password: `1234`
