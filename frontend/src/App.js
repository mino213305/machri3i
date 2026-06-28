import { useEffect, useMemo, useState } from "react";
import { Star, User, Check, X, Lock, Printer, Copy, ArrowLeft, Download, Heart } from "lucide-react";
import { translations, waiters } from "@/i18n";
import {
  RESTAURANT_NAME,
  GOOGLE_MAPS_LINK,
  MANAGER_EMAIL,
  ADMIN_PASSWORD,
  PUBLIC_APP_URL,
  IS_ACCOUNT_ACTIVE,
  ENABLE_ARABIC,
  RATE_LIMIT_MS,
  REDIRECT_DELAY_MS,
} from "@/config";
import "@/App.css";

/* =============================================================
 *  Aliases — keep legacy names readable inside this file.
 * ============================================================= */
const GOOGLE_MAPS_REVIEW_URL = GOOGLE_MAPS_LINK;
const isAccountActive = IS_ACCOUNT_ACTIVE;
const enableArabic = ENABLE_ARABIC;
const STAFF_PASSWORD = ADMIN_PASSWORD;

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const STORAGE_KEY = "gaia_reviews_v1";
const LANG_KEY = "gaia_lang_v1";
const RATE_LIMIT_KEY = "gaia_last_alert_v1";

/* =============================================================
 *  HARD-OVERRIDE STYLES — kills the platform branding badge
 *  no matter what. Inlined inside every top-level return.
 * ============================================================= */
const BRAND_KILLER_CSS = `
  #emergent-badge,
  a#emergent-badge,
  a[id*="emergent" i],
  a[href*="emergent.sh"],
  a[href*="emergent.host"],
  [class*="emergent-badge"],
  [class*="EmergentBadge"],
  [data-emergent],
  iframe[src*="emergent"],
  iframe,
  div[style*="fixed"][style*="bottom"],
  a[style*="fixed"][style*="bottom"] {
    display: none !important;
    opacity: 0 !important;
    visibility: hidden !important;
    pointer-events: none !important;
    width: 0 !important;
    height: 0 !important;
    position: fixed !important;
    left: -99999px !important;
    top: -99999px !important;
    z-index: -1 !important;
  }
`;

const BrandKillerStyle = () => (
  <style dangerouslySetInnerHTML={{ __html: BRAND_KILLER_CSS }} />
);

/* =============================================================
 *  STORAGE HELPERS
 * ============================================================= */
const loadReviews = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveReview = (review) => {
  const list = loadReviews();
  list.unshift(review);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
};

const getLastAlertAt = () => {
  try {
    const v = localStorage.getItem(RATE_LIMIT_KEY);
    return v ? parseInt(v, 10) : 0;
  } catch {
    return 0;
  }
};

const setLastAlertAt = (ts) => {
  try {
    localStorage.setItem(RATE_LIMIT_KEY, String(ts));
  } catch {
    /* ignore */
  }
};

const readSavedLang = () => {
  if (!enableArabic) return "en";
  try {
    const saved = localStorage.getItem(LANG_KEY);
    return saved === "ar" ? "ar" : "en";
  } catch {
    return "en";
  }
};

/* =============================================================
 *  PLATFORM-BRANDING KILLER (runtime defense)
 *  Used by both branches via <BrandKillerEffects />.
 * ============================================================= */
const BrandKillerEffects = () => {
  useEffect(() => {
    // (a) Inject persistent <style> in <head>
    const STYLE_TAG_ID = "gaia-brand-killer-style";
    if (!document.getElementById(STYLE_TAG_ID)) {
      const styleTag = document.createElement("style");
      styleTag.id = STYLE_TAG_ID;
      styleTag.appendChild(document.createTextNode(BRAND_KILLER_CSS));
      document.head.appendChild(styleTag);
    }

    // (b) + (c) Active removal
    const killBadge = () => {
      const selectors = [
        "#emergent-badge",
        'a[id*="emergent" i]',
        'a[href*="emergent.sh"]',
        'a[href*="emergent.host"]',
        '[class*="emergent-badge"]',
        '[class*="EmergentBadge"]',
        "[data-emergent]",
        'iframe[src*="emergent"]',
      ];
      selectors.forEach((sel) => {
        try {
          document.querySelectorAll(sel).forEach((el) => {
            try { el.remove(); } catch { /* ignore */ }
          });
        } catch { /* ignore */ }
      });
      // Text sweep: any leaf element saying "Made with Emergent"
      document.querySelectorAll("a, div, span, p, button").forEach((el) => {
        if (
          el.childElementCount === 0 &&
          /made with emergent/i.test((el.textContent || "").trim())
        ) {
          try { el.remove(); } catch { /* ignore */ }
        }
      });
    };

    killBadge();
    const observer = new MutationObserver(killBadge);
    observer.observe(document.body, { childList: true, subtree: true });
    const interval = setInterval(killBadge, 500);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);
  return null;
};

/* =============================================================
 *  STAR RATING (classic Google-Maps style, pure SVG)
 * ============================================================= */
const StarRating = ({ value, onChange }) => {
  const [hover, setHover] = useState(0);
  const display = hover || value;
  return (
    <div
      className="flex justify-center gap-3 sm:gap-4"
      onMouseLeave={() => setHover(0)}
      data-testid="rating-stars"
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const active = n <= display;
        return (
          <button
            key={n}
            type="button"
            className="star-btn"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(n)}
            data-testid={`rating-star-${n}`}
          >
            <Star
              size={42}
              strokeWidth={1.2}
              color={active ? "#D4AF37" : "#E6E2D8"}
              fill={active ? "#D4AF37" : "transparent"}
            />
          </button>
        );
      })}
    </div>
  );
};

/* =============================================================
 *  WAITER AVATAR
 * ============================================================= */
const WaiterAvatar = ({ selected }) => (
  <div
    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-colors duration-300 ${
      selected ? "bg-[#FAF6E8] ring-1 ring-[#D4AF37]" : "bg-[#F5F3ED]"
    }`}
  >
    <User size={32} strokeWidth={1.25} color={selected ? "#D4AF37" : "#9A938C"} />
  </div>
);

/* =============================================================
 *  MODALS
 * ============================================================= */
const ModalShell = ({ children, testId }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-6"
    style={{ background: "rgba(253, 251, 247, 0.95)", backdropFilter: "blur(10px)" }}
    role="dialog"
    aria-modal="true"
    data-testid={testId}
  >
    {children}
  </div>
);

const ThankYouModal = ({ t, onClose }) => (
  <ModalShell testId="thank-you-modal">
    <div className="modal-in max-w-md w-full bg-white border border-[#E6E2D8] px-8 py-12 text-center relative">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-[#7A7571] hover:text-[#2C2A29] transition-colors"
        aria-label="Close"
        data-testid="thank-you-close-button"
      >
        <X size={18} strokeWidth={1.5} />
      </button>
      <div className="mx-auto w-14 h-14 rounded-full border border-[#D4AF37] flex items-center justify-center mb-6">
        <Heart size={24} strokeWidth={1.4} color="#D4AF37" />
      </div>
      <h2 className="font-serif-display text-3xl text-[#2C2A29] mb-3">{t.thankYouTitle}</h2>
      <div className="gold-line mb-5" />
      <p className="text-[#7A7571] text-sm leading-relaxed">{t.thankYouBody}</p>
      <button
        onClick={onClose}
        className="mt-8 btn-text px-8 py-3 border border-[#2C2A29] text-[#2C2A29] hover:bg-[#2C2A29] hover:text-white transition-colors duration-300"
        data-testid="thank-you-dismiss-button"
      >
        {t.close}
      </button>
    </div>
  </ModalShell>
);

const RedirectingModal = ({ t }) => (
  <ModalShell testId="redirecting-modal">
    <div className="modal-in max-w-md w-full bg-white border border-[#E6E2D8] px-8 py-12 text-center">
      <div className="mx-auto w-14 h-14 rounded-full border border-[#D4AF37] flex items-center justify-center mb-6">
        <Check size={26} strokeWidth={1.5} color="#D4AF37" />
      </div>
      <h2 className="font-serif-display text-3xl text-[#2C2A29] mb-3" data-testid="redirecting-title">
        {t.redirectingTitle}
      </h2>
      <div className="gold-line mb-5" />
      <p className="text-[#7A7571] text-sm leading-relaxed" data-testid="redirecting-body">
        {t.redirectingBody}
      </p>
      <div
        className="mt-8 mx-auto h-[2px] w-40 overflow-hidden bg-[#E6E2D8] relative"
        aria-hidden="true"
      >
        <span
          className="absolute left-0 top-0 h-full bg-[#D4AF37]"
          style={{
            width: "100%",
            transform: "translateX(-100%)",
            animation: `redirectProgress ${REDIRECT_DELAY_MS}ms linear forwards`,
          }}
        />
      </div>
    </div>
  </ModalShell>
);

const RateLimitedModal = ({ t, onClose }) => (
  <ModalShell testId="rate-limit-modal">
    <div className="modal-in max-w-md w-full bg-white border border-[#E6E2D8] px-8 py-12 text-center relative">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-[#7A7571] hover:text-[#2C2A29] transition-colors"
        aria-label="Close"
        data-testid="rate-limit-close-button"
      >
        <X size={18} strokeWidth={1.5} />
      </button>
      <h2 className="font-serif-display text-3xl text-[#2C2A29] mb-3">{t.rateLimitedTitle}</h2>
      <div className="gold-line mb-5" />
      <p className="text-[#7A7571] text-sm leading-relaxed">{t.rateLimitedBody}</p>
      <button
        onClick={onClose}
        className="mt-8 btn-text px-8 py-3 border border-[#2C2A29] text-[#2C2A29] hover:bg-[#2C2A29] hover:text-white transition-colors duration-300"
        data-testid="rate-limit-dismiss-button"
      >
        {t.close}
      </button>
    </div>
  </ModalShell>
);

const PasswordModal = ({ t, onCancel, onConfirm }) => {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const submit = (e) => {
    e?.preventDefault();
    if (pw === STAFF_PASSWORD) onConfirm();
    else setErr(t.passwordIncorrect);
  };
  return (
    <ModalShell testId="password-modal">
      <form
        onSubmit={submit}
        className="modal-in max-w-sm w-full bg-white border border-[#E6E2D8] px-8 py-10 text-center relative"
      >
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 text-[#7A7571] hover:text-[#2C2A29] transition-colors"
          aria-label="Close"
          data-testid="password-cancel-button"
        >
          <X size={18} strokeWidth={1.5} />
        </button>
        <div className="mx-auto w-12 h-12 rounded-full border border-[#E6E2D8] flex items-center justify-center mb-5">
          <Lock size={18} strokeWidth={1.4} color="#7A7571" />
        </div>
        <p className="micro-label mb-4">{t.staffLogin}</p>
        <input
          type="password"
          autoFocus
          value={pw}
          onChange={(e) => { setPw(e.target.value); setErr(""); }}
          placeholder={t.enterPassword}
          className="w-full bg-transparent border-0 border-b border-[#E6E2D8] py-3 text-center text-base text-[#2C2A29] placeholder-[#9A938C] focus:outline-none focus:border-[#D4AF37] transition-colors"
          data-testid="password-input"
        />
        {err && (
          <p className="mt-3 text-xs text-[#8B0000]" data-testid="password-error">
            {err}
          </p>
        )}
        <button
          type="submit"
          className="mt-6 w-full bg-[#2C2A29] text-white py-3 btn-text hover:bg-[#D4AF37] transition-colors duration-300"
          data-testid="password-submit-button"
        >
          {t.staffLogin}
        </button>
      </form>
    </ModalShell>
  );
};

/* =============================================================
 *  CUSTOMER VIEW
 * ============================================================= */
const CustomerView = ({ t, lang, onOpenDashboard }) => {
  const [selectedWaiter, setSelectedWaiter] = useState(null);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [showThankYou, setShowThankYou] = useState(false);
  const [showRedirecting, setShowRedirecting] = useState(false);
  const [showRateLimited, setShowRateLimited] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const sendLowRatingAlert = async (waiterObj) => {
    try {
      const res = await fetch(`${API}/alerts/low-rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          waiter_name: waiterObj ? waiterObj.en : "Unknown",
          comment: feedback.trim(),
          language: lang,
        }),
      });
      if (res.status === 429) return { ok: false, rateLimited: true };
      return { ok: res.ok, rateLimited: false };
    } catch (e) {
      console.warn("Alert send failed:", e);
      return { ok: false, rateLimited: false };
    }
  };

  const resetForm = () => {
    setSelectedWaiter(null);
    setRating(0);
    setFeedback("");
  };

  const handleSubmit = async () => {
    if (!selectedWaiter) { setFormError(t.pleaseSelectWaiter); return; }
    if (!rating) { setFormError(t.pleaseRate); return; }
    setFormError("");

    const waiterObj = waiters.find((w) => w.id === selectedWaiter);

    const review = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      waiterId: selectedWaiter,
      rating,
      feedback: feedback.trim(),
      createdAt: new Date().toISOString(),
    };
    saveReview(review);

    if (rating >= 4) {
      // Show a graceful 2.5s transition before opening Google Maps.
      setShowRedirecting(true);
      setTimeout(() => {
        window.open(GOOGLE_MAPS_REVIEW_URL, "_blank", "noopener,noreferrer");
        setShowRedirecting(false);
        resetForm();
      }, REDIRECT_DELAY_MS);
      return;
    }

    const now = Date.now();
    if (now - getLastAlertAt() < RATE_LIMIT_MS) {
      setShowRateLimited(true);
      return;
    }

    setSubmitting(true);
    const result = await sendLowRatingAlert(waiterObj);
    setSubmitting(false);

    if (result.rateLimited) { setShowRateLimited(true); return; }
    setLastAlertAt(now);
    setShowThankYou(true);
  };

  const closeThankYou = () => {
    setShowThankYou(false);
    resetForm();
  };

  return (
    <div className="w-full max-w-md mx-auto px-6 pt-20 pb-16 flex flex-col">
      <header className="text-center fade-up fade-up-1">
        <p className="micro-label">{t.eyebrow}</p>
        <div className="gold-line my-5" />
        <p className="font-serif-display text-lg sm:text-xl text-[#2C2A29]">{t.welcome}</p>
        <h1 className="brand-mark text-[#2C2A29] mt-2" data-testid="restaurant-name">
          {RESTAURANT_NAME}
        </h1>
        <p className="micro-label mt-5">{t.tagline}</p>
      </header>

      <section className="mt-14 fade-up fade-up-2">
        <p className="micro-label text-center mb-6">{t.selectWaiterLabel}</p>
        <div className="grid grid-cols-3 gap-x-2 gap-y-6">
          {waiters.map((w) => {
            const selected = selectedWaiter === w.id;
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => setSelectedWaiter(w.id)}
                className="flex flex-col items-center gap-3 group focus:outline-none"
                data-testid={`waiter-card-${w.id}`}
              >
                <WaiterAvatar selected={selected} />
                <span
                  className={`text-[11px] sm:text-xs uppercase tracking-[0.2em] transition-colors ${
                    selected ? "text-[#D4AF37]" : "text-[#2C2A29]"
                  }`}
                >
                  {w[lang]}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-14 fade-up fade-up-3">
        <p className="micro-label text-center mb-6">{t.rateLabel}</p>
        <StarRating value={rating} onChange={setRating} />
      </section>

      <section className="mt-14 fade-up fade-up-4">
        <p className="micro-label mb-3">{t.feedbackLabel}</p>
        <textarea
          rows={3}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder={t.feedbackPlaceholder}
          className="w-full bg-transparent border-0 border-b border-[#E6E2D8] py-3 text-base text-[#2C2A29] placeholder-[#9A938C] focus:outline-none focus:border-[#D4AF37] transition-colors resize-none"
          data-testid="feedback-textarea"
        />
      </section>

      {formError && (
        <p className="mt-6 text-xs text-[#8B0000] text-center" data-testid="form-error">
          {formError}
        </p>
      )}

      <div className="mt-10 fade-up fade-up-5">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-[#2C2A29] text-white py-4 btn-text hover:bg-[#D4AF37] transition-colors duration-300 disabled:opacity-60 disabled:cursor-wait"
          data-testid="submit-review-button"
        >
          {submitting ? t.sending : t.submit}
        </button>
      </div>

      <div className="mt-20 text-center">
        <button
          type="button"
          onClick={onOpenDashboard}
          className="text-[10px] tracking-[0.3em] uppercase text-[#D6D2C8] hover:text-[#7A7571] transition-colors"
          data-testid="staff-login-link"
        >
          {t.staffLogin}
        </button>
      </div>

      {showThankYou && <ThankYouModal t={t} onClose={closeThankYou} />}
      {showRedirecting && <RedirectingModal t={t} />}
      {showRateLimited && (
        <RateLimitedModal t={t} onClose={() => setShowRateLimited(false)} />
      )}
    </div>
  );
};

/* =============================================================
 *  QR CODE BLOCK (used in Dashboard + /qr route)
 * ============================================================= */
const buildQrUrl = (data, size = 1000) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&format=png&ecc=H&data=${encodeURIComponent(data)}`;

const QrCard = ({ t, targetUrl, compact = false }) => {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* ignore */ }
  };

  const handlePrint = () => window.print();

  return (
    <div
      className={`qr-card bg-white border border-[#E6E2D8] ${compact ? "p-6" : "p-12 sm:p-16"} text-center`}
      data-testid="qr-card"
    >
      <p className="micro-label qr-brand">{RESTAURANT_NAME}</p>
      <div className="gold-line my-4" />
      <h3 className="font-serif-display text-2xl sm:text-3xl text-[#2C2A29]">{t.qrTitle}</h3>
      <p className="text-xs text-[#7A7571] mt-2">{t.qrSubtitle}</p>

      <div className="qr-image-wrap my-8 inline-block p-4 border border-[#E6E2D8] bg-white">
        <img
          src={buildQrUrl(targetUrl, 1000)}
          alt="QR code"
          width={compact ? 220 : 360}
          height={compact ? 220 : 360}
          style={{ display: "block", width: compact ? 220 : 360, height: compact ? 220 : 360 }}
          data-testid="qr-image"
        />
      </div>

      <p className="micro-label">{t.scanCta}</p>
      <p className="qr-url mt-2 text-[11px] text-[#9A938C] break-all max-w-md mx-auto">
        {targetUrl}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 no-print">
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-5 py-2.5 btn-text border border-[#2C2A29] text-[#2C2A29] hover:bg-[#2C2A29] hover:text-white transition-colors"
          data-testid="qr-print-button"
        >
          <Printer size={14} strokeWidth={1.5} /> {t.qrPrint}
        </button>
        <button
          onClick={copyLink}
          className="inline-flex items-center gap-2 px-5 py-2.5 btn-text border border-[#E6E2D8] text-[#7A7571] hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors"
          data-testid="qr-copy-button"
        >
          <Copy size={14} strokeWidth={1.5} /> {copied ? t.qrCopied : t.qrCopy}
        </button>
      </div>
    </div>
  );
};

/* =============================================================
 *  STANDALONE /qr ROUTE — fully self-contained, no router needed
 * ============================================================= */
const PrintableQrView = () => {
  const lang = readSavedLang();
  const t = translations[lang];

  useEffect(() => {
    document.documentElement.setAttribute("dir", t.dir);
    document.documentElement.setAttribute("lang", lang);
  }, [lang, t.dir]);

  return (
    <>
      <BrandKillerStyle />
      <BrandKillerEffects />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          minHeight: "100vh",
          width: "100%",
          backgroundColor: "#ffffff",
          padding: "32px 20px",
          boxSizing: "border-box",
        }}
        data-testid="qr-route-root"
      >
        <a
          href="/"
          className="no-print"
          style={{
            alignSelf: "flex-start",
            maxWidth: "640px",
            width: "100%",
            margin: "0 auto 16px",
            color: "#7A7571",
            fontSize: "10px",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
          data-testid="qr-back-link"
        >
          <ArrowLeft size={12} strokeWidth={1.5} /> {t.qrBack}
        </a>

        <div style={{ maxWidth: "640px", width: "100%", margin: "0 auto" }}>
          <QrCard t={t} targetUrl={PUBLIC_APP_URL} />
        </div>
      </div>
    </>
  );
};

/* =============================================================
 *  OWNER DASHBOARD
 * ============================================================= */
const OwnerDashboard = ({ t, lang, onLogout }) => {
  const reviews = useMemo(() => loadReviews(), []);
  const total = reviews.length;
  const avg = total === 0 ? 0 : reviews.reduce((s, r) => s + r.rating, 0) / total;

  const waiterMap = useMemo(() => {
    const m = {};
    waiters.forEach((w) => {
      m[w.id] = { id: w.id, name: w[lang], count: 0, sum: 0, dist: [0, 0, 0, 0, 0] };
    });
    reviews.forEach((r) => {
      if (!m[r.waiterId]) return;
      m[r.waiterId].count += 1;
      m[r.waiterId].sum += r.rating;
      m[r.waiterId].dist[r.rating - 1] += 1;
    });
    return Object.values(m).sort((a, b) => b.count - a.count);
  }, [reviews, lang]);

  const fmtDate = (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString(lang === "ar" ? "ar-AE" : "en-GB", {
        year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const exportCsv = () => {
    const escape = (v) => {
      const s = String(v ?? "");
      // Wrap in quotes and escape internal quotes per RFC 4180
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ["id", "date", "waiter", "rating", "comment"];
    const rows = reviews.map((r) => {
      const w = waiters.find((x) => x.id === r.waiterId);
      return [
        r.id,
        new Date(r.createdAt).toISOString(),
        w ? w.en : "Unknown",
        r.rating,
        (r.feedback || "").replace(/\r?\n/g, " "),
      ].map(escape).join(",");
    });
    const csv = "\uFEFF" + [header.join(","), ...rows].join("\n"); // BOM for Excel UTF-8
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    a.href = url;
    a.download = `${RESTAURANT_NAME.toLowerCase()}-reviews-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-16 fade-up">
      <div className="flex items-center justify-between mb-10">
        <div>
          <p className="micro-label">{RESTAURANT_NAME}</p>
          <h1 className="font-serif-display text-3xl sm:text-4xl text-[#2C2A29] mt-1">
            {t.dashboardTitle}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            disabled={total === 0}
            className="inline-flex items-center gap-2 px-5 py-2 btn-text border border-[#E6E2D8] text-[#7A7571] hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            data-testid="csv-export-button"
            title={t.csvExportHint}
          >
            <Download size={14} strokeWidth={1.5} /> {t.csvExport}
          </button>
          <button
            onClick={onLogout}
            className="px-5 py-2 btn-text border border-[#2C2A29] text-[#2C2A29] hover:bg-[#2C2A29] hover:text-white transition-colors"
            data-testid="dashboard-logout-button"
          >
            {t.logout}
          </button>
        </div>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-[#E6E2D8] border border-[#E6E2D8] mb-14">
        <StatCard label={t.totalReviews} value={total} testId="stat-total" />
        <StatCard label={t.averageRating} value={total ? avg.toFixed(2) : t.none} accent testId="stat-average" />
        <StatCard label={t.waitersTracked} value={waiters.length} testId="stat-waiters" />
      </section>

      <section className="mb-14">
        <p className="micro-label mb-4">{t.breakdown}</p>
        <div className="overflow-x-auto border border-[#E6E2D8]">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#FAF8F2]">
                <Th>{t.waiter}</Th>
                <Th>{t.reviews}</Th>
                <Th>{t.average}</Th>
                <Th>{t.distribution}</Th>
              </tr>
            </thead>
            <tbody>
              {waiterMap.map((w) => (
                <tr key={w.id} className="border-t border-[#E6E2D8]/70">
                  <Td>{w.name}</Td>
                  <Td>{w.count}</Td>
                  <Td>{w.count ? (w.sum / w.count).toFixed(2) : t.none}</Td>
                  <Td>
                    <span className="inline-flex gap-2 text-[11px] text-[#7A7571]">
                      {w.dist.map((c, i) => (
                        <span key={i}>
                          <span className="text-[#D4AF37]">{i + 1}★</span>: {c}
                        </span>
                      ))}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-14">
        <p className="micro-label mb-4">{t.recent}</p>
        {total === 0 ? (
          <p className="text-sm text-[#7A7571] py-8 text-center border border-dashed border-[#E6E2D8]">
            {t.noReviewsYet}
          </p>
        ) : (
          <div className="overflow-x-auto border border-[#E6E2D8]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#FAF8F2]">
                  <Th>{t.date}</Th>
                  <Th>{t.waiter}</Th>
                  <Th>{t.rating}</Th>
                  <Th>{t.comment}</Th>
                </tr>
              </thead>
              <tbody>
                {reviews.slice(0, 50).map((r) => {
                  const w = waiters.find((x) => x.id === r.waiterId);
                  return (
                    <tr key={r.id} className="border-t border-[#E6E2D8]/70" data-testid={`review-row-${r.id}`}>
                      <Td>{fmtDate(r.createdAt)}</Td>
                      <Td>{w ? w[lang] : t.none}</Td>
                      <Td>
                        <span className="text-[#D4AF37]">{"★".repeat(r.rating)}</span>
                        <span className="text-[#E6E2D8]">{"★".repeat(5 - r.rating)}</span>
                      </Td>
                      <Td>
                        <span className="text-[#2C2A29]">{r.feedback || t.none}</span>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-4">
        <p className="micro-label mb-4">{t.qrTitle}</p>
        <QrCard t={t} targetUrl={PUBLIC_APP_URL} compact />
        <p className="mt-3 text-center">
          <a
            href="/qr"
            className="inline-flex items-center gap-2 micro-label hover:text-[#D4AF37] transition-colors"
            data-testid="qr-standalone-link"
          >
            {t.qrOpenStandalone}
          </a>
        </p>
      </section>
    </div>
  );
};

const StatCard = ({ label, value, accent, testId }) => (
  <div className="bg-white p-8 text-center" data-testid={testId}>
    <p className="micro-label mb-3">{label}</p>
    <p className={`font-serif-display text-4xl ${accent ? "text-[#D4AF37]" : "text-[#2C2A29]"}`}>{value}</p>
  </div>
);

const Th = ({ children }) => (
  <th className="px-4 py-3 text-[10px] uppercase tracking-[0.25em] text-[#7A7571] text-start font-normal">
    {children}
  </th>
);
const Td = ({ children }) => (
  <td className="px-4 py-3 text-sm text-[#2C2A29] align-middle">{children}</td>
);

/* =============================================================
 *  SUSPENDED VIEW
 * ============================================================= */
const SuspendedView = () => (
  <>
    <BrandKillerStyle />
    <BrandKillerEffects />
    <div className="min-h-screen flex items-center justify-center px-6 text-center">
      <div className="max-w-md flex flex-col items-center gap-6 fade-up">
        <p className="micro-label">{RESTAURANT_NAME}</p>
        <div className="gold-line" />
        <p className="font-serif-display text-2xl text-[#2C2A29] leading-snug" data-testid="suspended-en">
          This service is temporarily suspended. Please contact technical support.
        </p>
        <p
          dir="rtl"
          className="text-2xl text-[#2C2A29] leading-snug"
          style={{ fontFamily: "Cairo, sans-serif" }}
          data-testid="suspended-ar"
        >
          هذه الخدمة متوقفة مؤقتاً، يرجى التواصل مع الدعم الفني.
        </p>
      </div>
    </div>
  </>
);

/* =============================================================
 *  LANGUAGE TOGGLE
 * ============================================================= */
const LanguageToggle = ({ onToggle, t }) => {
  if (!enableArabic) return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      className="fixed top-5 right-5 z-40 px-4 py-2 btn-text bg-white/80 backdrop-blur-sm border border-[#E6E2D8] text-[#2C2A29] hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors duration-300 no-print"
      aria-label="Toggle language"
      data-testid="language-toggle-button"
    >
      {t.toggleLabel}
    </button>
  );
};

/* =============================================================
 *  MAIN CUSTOMER + DASHBOARD APP
 * ============================================================= */
const MainApp = () => {
  const [lang, setLang] = useState(readSavedLang);
  const [view, setView] = useState("customer");
  const [askingPassword, setAskingPassword] = useState(false);
  const [fadeKey, setFadeKey] = useState(0);

  const t = translations[lang];

  useEffect(() => {
    document.documentElement.setAttribute("dir", t.dir);
    document.documentElement.setAttribute("lang", lang);
    try { localStorage.setItem(LANG_KEY, lang); } catch { /* ignore */ }
  }, [lang, t.dir]);

  const toggleLang = () => {
    if (!enableArabic) return;
    setLang((l) => (l === "en" ? "ar" : "en"));
    setFadeKey((k) => k + 1);
  };

  return (
    <>
      <BrandKillerStyle />
      <BrandKillerEffects />
      <div className="min-h-screen" style={{ background: "var(--bg)" }}>
        <LanguageToggle onToggle={toggleLang} t={t} />
        <main key={`${view}-${lang}-${fadeKey}`} className="fade-up">
          {view === "customer" ? (
            <CustomerView t={t} lang={lang} onOpenDashboard={() => setAskingPassword(true)} />
          ) : (
            <OwnerDashboard t={t} lang={lang} onLogout={() => setView("customer")} />
          )}
        </main>
        {askingPassword && (
          <PasswordModal
            t={t}
            onCancel={() => setAskingPassword(false)}
            onConfirm={() => { setAskingPassword(false); setView("dashboard"); }}
          />
        )}
      </div>
    </>
  );
};

/* =============================================================
 *  APP DISPATCHER (top-level)
 *  >>>  Strict path check is the VERY FIRST thing rendered.  <<<
 * ============================================================= */
export default function App() {
  // === BULLETPROOF /qr ROUTE ===
  // No router, no state, no hooks above. Just a hard `window.location.pathname` check.
  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  if (path === "/qr" || path === "/qr/") {
    return <PrintableQrView />;
  }

  if (!isAccountActive) return <SuspendedView />;

  return <MainApp />;
}

/* Export config for documentation / testing */
export { RESTAURANT_NAME, GOOGLE_MAPS_REVIEW_URL, MANAGER_EMAIL, PUBLIC_APP_URL };
