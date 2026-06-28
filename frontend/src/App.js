import { useEffect, useMemo, useState } from "react";
import { Star, User, Check, X, Lock } from "lucide-react";
import { translations, waiters } from "@/i18n";
import "@/App.css";

/* =========================================================
 *  MASTER CONTROLLER — flip to false to suspend the app
 * ========================================================= */
const isAccountActive = true;

/* =========================================================
 *  CONFIGURATION
 * ========================================================= */
const GOOGLE_MAPS_REVIEW_URL =
  "https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4"; // Replace with your real Place ID URL
const STAFF_PASSWORD = "1234";
const STORAGE_KEY = "gaia_reviews_v1";
const LANG_KEY = "gaia_lang_v1";

/* =========================================================
 *  HELPERS
 * ========================================================= */
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

/* =========================================================
 *  STAR RATING (classic Google-Maps style, pure SVG)
 * ========================================================= */
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
              className="transition-colors"
              color={active ? "#D4AF37" : "#E6E2D8"}
              fill={active ? "#D4AF37" : "transparent"}
            />
          </button>
        );
      })}
    </div>
  );
};

/* =========================================================
 *  WAITER AVATAR (clean grey user vector)
 * ========================================================= */
const WaiterAvatar = ({ selected }) => (
  <div
    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-colors duration-300 ${
      selected
        ? "bg-[#FAF6E8] ring-1 ring-[#D4AF37]"
        : "bg-[#F5F3ED]"
    }`}
  >
    <User
      size={32}
      strokeWidth={1.25}
      color={selected ? "#D4AF37" : "#9A938C"}
    />
  </div>
);

/* =========================================================
 *  THANK YOU MODAL
 * ========================================================= */
const ThankYouModal = ({ t, onClose }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-6"
    style={{ background: "rgba(253, 251, 247, 0.95)", backdropFilter: "blur(10px)" }}
    role="dialog"
    aria-modal="true"
    data-testid="thank-you-modal"
  >
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
        <Check size={26} strokeWidth={1.5} color="#D4AF37" />
      </div>

      <h2 className="font-serif-display text-3xl text-[#2C2A29] mb-3">
        {t.thankYouTitle}
      </h2>
      <div className="gold-line mb-5" />
      <p className="text-[#7A7571] text-sm leading-relaxed">{t.thankYouBody}</p>

      <button
        onClick={onClose}
        className="mt-8 inline-block px-8 py-3 text-xs uppercase tracking-[0.25em] border border-[#2C2A29] text-[#2C2A29] hover:bg-[#2C2A29] hover:text-white transition-colors duration-300"
        data-testid="thank-you-dismiss-button"
      >
        {t.close}
      </button>
    </div>
  </div>
);

/* =========================================================
 *  PASSWORD MODAL
 * ========================================================= */
const PasswordModal = ({ t, onCancel, onConfirm }) => {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const submit = (e) => {
    e?.preventDefault();
    if (pw === STAFF_PASSWORD) {
      onConfirm();
    } else {
      setErr(t.passwordIncorrect);
    }
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(253, 251, 247, 0.95)", backdropFilter: "blur(10px)" }}
      role="dialog"
      aria-modal="true"
      data-testid="password-modal"
    >
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

        <p className="text-xs uppercase tracking-[0.25em] text-[#7A7571] mb-4">
          {t.staffLogin}
        </p>

        <input
          type="password"
          autoFocus
          value={pw}
          onChange={(e) => {
            setPw(e.target.value);
            setErr("");
          }}
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
          className="mt-6 w-full bg-[#2C2A29] text-white py-3 text-xs uppercase tracking-[0.25em] hover:bg-[#D4AF37] transition-colors duration-300"
          data-testid="password-submit-button"
        >
          {t.staffLogin}
        </button>
      </form>
    </div>
  );
};

/* =========================================================
 *  CUSTOMER VIEW
 * ========================================================= */
const CustomerView = ({ t, lang, onOpenDashboard }) => {
  const [selectedWaiter, setSelectedWaiter] = useState(null);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [showThankYou, setShowThankYou] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = () => {
    if (!selectedWaiter) {
      setFormError(t.pleaseSelectWaiter);
      return;
    }
    if (!rating) {
      setFormError(t.pleaseRate);
      return;
    }
    setFormError("");

    const review = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      waiterId: selectedWaiter,
      rating,
      feedback: feedback.trim(),
      createdAt: new Date().toISOString(),
    };
    saveReview(review);

    if (rating >= 4) {
      window.open(GOOGLE_MAPS_REVIEW_URL, "_blank", "noopener,noreferrer");
      // Reset form
      setSelectedWaiter(null);
      setRating(0);
      setFeedback("");
    } else {
      setShowThankYou(true);
    }
  };

  const closeThankYou = () => {
    setShowThankYou(false);
    setSelectedWaiter(null);
    setRating(0);
    setFeedback("");
  };

  return (
    <div className="w-full max-w-md mx-auto px-6 pt-20 pb-16 flex flex-col">
      {/* Header */}
      <header className="text-center fade-up fade-up-1">
        <p className="text-[10px] sm:text-xs uppercase tracking-[0.4em] text-[#7A7571]">
          {t.eyebrow}
        </p>
        <div className="gold-line my-5" />
        <p className="font-serif-display text-lg sm:text-xl text-[#2C2A29]">
          {t.welcome}
        </p>
        <h1
          className="font-serif-display text-5xl sm:text-6xl tracking-[0.25em] uppercase text-[#2C2A29] mt-2"
          data-testid="restaurant-name"
        >
          {t.brand}
        </h1>
        <p className="text-xs uppercase tracking-[0.3em] text-[#7A7571] mt-5">
          {t.tagline}
        </p>
      </header>

      {/* Waiter Selection */}
      <section className="mt-14 fade-up fade-up-2">
        <p className="text-[10px] sm:text-xs uppercase tracking-[0.35em] text-[#7A7571] text-center mb-6">
          {t.selectWaiterLabel}
        </p>
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

      {/* Rating */}
      <section className="mt-14 fade-up fade-up-3">
        <p className="text-[10px] sm:text-xs uppercase tracking-[0.35em] text-[#7A7571] text-center mb-6">
          {t.rateLabel}
        </p>
        <StarRating value={rating} onChange={setRating} />
      </section>

      {/* Feedback */}
      <section className="mt-14 fade-up fade-up-4">
        <p className="text-[10px] sm:text-xs uppercase tracking-[0.35em] text-[#7A7571] mb-3">
          {t.feedbackLabel}
        </p>
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
        <p
          className="mt-6 text-xs text-[#8B0000] text-center"
          data-testid="form-error"
        >
          {formError}
        </p>
      )}

      {/* Submit */}
      <div className="mt-10 fade-up fade-up-5">
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full bg-[#2C2A29] text-white py-4 text-xs uppercase tracking-[0.3em] hover:bg-[#D4AF37] transition-colors duration-300"
          data-testid="submit-review-button"
        >
          {t.submit}
        </button>
      </div>

      {/* Staff Login link (hidden-style) */}
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
    </div>
  );
};

/* =========================================================
 *  OWNER DASHBOARD
 * ========================================================= */
const OwnerDashboard = ({ t, lang, onLogout }) => {
  const reviews = useMemo(() => loadReviews(), []);
  const total = reviews.length;
  const avg =
    total === 0
      ? 0
      : reviews.reduce((s, r) => s + r.rating, 0) / total;

  // Per-waiter aggregation
  const waiterMap = useMemo(() => {
    const m = {};
    waiters.forEach((w) => {
      m[w.id] = {
        id: w.id,
        name: w[lang],
        count: 0,
        sum: 0,
        dist: [0, 0, 0, 0, 0], // 1..5
      };
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
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-16 fade-up">
      <div className="flex items-center justify-between mb-10">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#7A7571]">
            GAIA
          </p>
          <h1 className="font-serif-display text-3xl sm:text-4xl text-[#2C2A29] mt-1">
            {t.dashboardTitle}
          </h1>
        </div>
        <button
          onClick={onLogout}
          className="px-5 py-2 text-[10px] uppercase tracking-[0.3em] border border-[#2C2A29] text-[#2C2A29] hover:bg-[#2C2A29] hover:text-white transition-colors"
          data-testid="dashboard-logout-button"
        >
          {t.logout}
        </button>
      </div>

      {/* Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-[#E6E2D8] border border-[#E6E2D8] mb-14">
        <StatCard label={t.totalReviews} value={total} testId="stat-total" />
        <StatCard
          label={t.averageRating}
          value={total ? avg.toFixed(2) : t.none}
          accent
          testId="stat-average"
        />
        <StatCard
          label={t.waitersTracked}
          value={waiters.length}
          testId="stat-waiters"
        />
      </section>

      {/* Breakdown table */}
      <section className="mb-14">
        <p className="text-[10px] uppercase tracking-[0.35em] text-[#7A7571] mb-4">
          {t.breakdown}
        </p>
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
                  <Td>
                    {w.count
                      ? (w.sum / w.count).toFixed(2)
                      : t.none}
                  </Td>
                  <Td>
                    <span className="inline-flex gap-2 text-[11px] text-[#7A7571]">
                      {w.dist.map((c, i) => (
                        <span key={i}>
                          <span className="text-[#D4AF37]">{i + 1}★</span>:{" "}
                          {c}
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

      {/* Recent feedback */}
      <section>
        <p className="text-[10px] uppercase tracking-[0.35em] text-[#7A7571] mb-4">
          {t.recent}
        </p>
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
                    <tr
                      key={r.id}
                      className="border-t border-[#E6E2D8]/70"
                      data-testid={`review-row-${r.id}`}
                    >
                      <Td>{fmtDate(r.createdAt)}</Td>
                      <Td>{w ? w[lang] : t.none}</Td>
                      <Td>
                        <span className="text-[#D4AF37]">
                          {"★".repeat(r.rating)}
                        </span>
                        <span className="text-[#E6E2D8]">
                          {"★".repeat(5 - r.rating)}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-[#2C2A29]">
                          {r.feedback || t.none}
                        </span>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

const StatCard = ({ label, value, accent, testId }) => (
  <div className="bg-white p-8 text-center" data-testid={testId}>
    <p className="text-[10px] uppercase tracking-[0.35em] text-[#7A7571] mb-3">
      {label}
    </p>
    <p
      className={`font-serif-display text-4xl ${
        accent ? "text-[#D4AF37]" : "text-[#2C2A29]"
      }`}
    >
      {value}
    </p>
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

/* =========================================================
 *  SUSPENDED VIEW
 * ========================================================= */
const SuspendedView = () => (
  <div className="min-h-screen flex items-center justify-center px-6 text-center">
    <div className="max-w-md flex flex-col items-center gap-6 fade-up">
      <p className="text-[10px] uppercase tracking-[0.4em] text-[#7A7571]">
        GAIA
      </p>
      <div className="gold-line" />
      <p
        className="font-serif-display text-2xl text-[#2C2A29] leading-snug"
        data-testid="suspended-en"
      >
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
);

/* =========================================================
 *  LANGUAGE TOGGLE
 * ========================================================= */
const LanguageToggle = ({ lang, onToggle, t }) => (
  <button
    type="button"
    onClick={onToggle}
    className="fixed top-5 right-5 z-40 px-4 py-2 text-xs uppercase tracking-[0.25em] bg-white/80 backdrop-blur-sm border border-[#E6E2D8] text-[#2C2A29] hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors duration-300"
    aria-label="Toggle language"
    data-testid="language-toggle-button"
  >
    {t.toggleLabel}
  </button>
);

/* =========================================================
 *  APP ROOT
 * ========================================================= */
export default function App() {
  const [lang, setLang] = useState(() => {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      return saved === "ar" ? "ar" : "en";
    } catch {
      return "en";
    }
  });
  const [view, setView] = useState("customer"); // customer | dashboard
  const [askingPassword, setAskingPassword] = useState(false);
  const [fadeKey, setFadeKey] = useState(0);

  const t = translations[lang];

  // Set <html dir> + lang
  useEffect(() => {
    document.documentElement.setAttribute("dir", t.dir);
    document.documentElement.setAttribute("lang", lang);
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* ignore */
    }
  }, [lang, t.dir]);

  const toggleLang = () => {
    setLang((l) => (l === "en" ? "ar" : "en"));
    setFadeKey((k) => k + 1); // re-trigger fade
  };

  if (!isAccountActive) {
    return <SuspendedView />;
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <LanguageToggle lang={lang} onToggle={toggleLang} t={t} />

      <main key={`${view}-${lang}-${fadeKey}`} className="fade-up">
        {view === "customer" ? (
          <CustomerView
            t={t}
            lang={lang}
            onOpenDashboard={() => setAskingPassword(true)}
          />
        ) : (
          <OwnerDashboard
            t={t}
            lang={lang}
            onLogout={() => setView("customer")}
          />
        )}
      </main>

      {askingPassword && (
        <PasswordModal
          t={t}
          onCancel={() => setAskingPassword(false)}
          onConfirm={() => {
            setAskingPassword(false);
            setView("dashboard");
          }}
        />
      )}
    </div>
  );
}
