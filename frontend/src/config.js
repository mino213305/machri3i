// =============================================================
//  GAIA — Centralized Master Configuration
//  Edit this single file when forking the template for another
//  restaurant. All UI strings remain in `i18n.js`.
// =============================================================

// --- Restaurant identity ---
export const RESTAURANT_NAME = "GAIA";

// --- Public URLs ---
// Where the QR code points to (the public address of this site).
export const PUBLIC_APP_URL = "https://elite-service-stars.emergent.host";

// Google Maps review link the customer is redirected to on 4-5 stars.
// Use the official Place ID link: https://search.google.com/local/writereview?placeid=YOUR_PLACE_ID
export const GOOGLE_MAPS_LINK =
  "https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4";

// --- Operational config ---
// Manager email (display + sent as recipient in backend; backend ENV wins for actual delivery)
export const MANAGER_EMAIL = "manager@gaia.ae";

// Staff/admin password gate for the dashboard + CSV export.
// Defined here for easy forking. Keep simple; rotate after any breach.
export const ADMIN_PASSWORD = "1234";

// --- Master switches ---
export const IS_ACCOUNT_ACTIVE = true;  // false → show suspended notice full-screen
export const ENABLE_ARABIC = true;      // false → hide AR toggle entirely

// --- Timing (advanced) ---
export const RATE_LIMIT_MS = 15 * 60 * 1000;  // Spam-protection window (must match backend)
export const REDIRECT_DELAY_MS = 2500;        // 5★ pre-redirect transition duration
