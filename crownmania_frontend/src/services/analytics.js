/**
 * First-party analytics beacon.
 *
 * Sends pageview pings on route changes and heartbeats while the tab is
 * visible, so the admin dashboard can show visitors online now, today's
 * pageviews/uniques, and top pages. Data lands in the backend's own
 * Firestore collections — no third-party tracker, so ad-blockers don't
 * suppress it and nothing leaves our infrastructure.
 *
 * Privacy: sessions are per-tab randoms in sessionStorage (no cookies, no
 * accounts); honors Do Not Track; the /admin section is never tracked.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:5001' : 'https://crownmania-backend-production.up.railway.app');

const SESSION_KEY = 'cm_analytics_session';
const HEARTBEAT_MS = 45 * 1000;

let sessionId = null;
let heartbeatTimer = null;
let referrerSent = false;

const getSessionId = () => {
  if (sessionId) return sessionId;
  try {
    sessionId = sessionStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      const rand = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}${Math.random()}`)
        .replace(/[^a-zA-Z0-9]/g, '');
      sessionId = `s_${rand}`.slice(0, 48);
      sessionStorage.setItem(SESSION_KEY, sessionId);
    }
  } catch {
    sessionId = `s_${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  }
  return sessionId;
};

const dntEnabled = () =>
  navigator.doNotTrack === '1' || navigator.doNotTrack === 'yes' ||
  window.doNotTrack === '1';

const shouldSkip = (path) =>
  dntEnabled() || String(path || '').startsWith('/admin');

const ping = (type, path) => {
  if (shouldSkip(path)) return;
  const payload = {
    sessionId: getSessionId(),
    type,
    path,
    referrer: !referrerSent ? (document.referrer || '') : undefined,
  };
  referrerSent = true;

  // keepalive lets the ping survive tab close; fetch is fine for a fire-and-forget beacon
  fetch(`${API_BASE_URL}/api/analytics/ping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
    credentials: 'omit',
  }).catch(() => {});
};

const startHeartbeat = () => {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(() => {
    if (document.visibilityState === 'visible') {
      ping('heartbeat', window.location.pathname);
    }
  }, HEARTBEAT_MS);
};

/** Call once from App inside <Router>. Tracks pageviews on route changes. */
export const initAnalytics = () => {
  startHeartbeat();
};

/** Fire on every route change (React Router location). */
export const trackPageview = (path) => ping('pageview', path);
