/**
 * CROWNMANIA ADMIN API CLIENT
 * ============================
 * Self-contained client for the /api/admin backend endpoints.
 * Token is stored in sessionStorage (never localStorage).
 */

const API_BASE_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:5001' : 'https://crownmania-backend-production.up.railway.app');

const TOKEN_KEY = 'crownmania_admin_token';

export const getAdminToken = () => {
  try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
};

export const setAdminToken = (token) => {
  try { sessionStorage.setItem(TOKEN_KEY, token); } catch { /* storage unavailable */ }
};

export const clearAdminToken = () => {
  try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ }
};

/** Thrown on 401 so callers can distinguish auth expiry from other errors. */
export class AdminAuthError extends Error {
  constructor(message) {
    super(message || 'Session expired');
    this.name = 'AdminAuthError';
  }
}

/**
 * Authenticated (or public, with auth:false) JSON request to the admin API.
 * @param {string} path - e.g. '/api/admin/stats'
 * @param {object} opts - { method, body, auth }
 */
export async function adminRequest(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getAdminToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Network error — could not reach the server.');
  }

  let data = null;
  try { data = await res.json(); } catch { /* non-JSON response */ }

  if (res.status === 401 || res.status === 403) {
    if (auth) clearAdminToken();
    throw new AdminAuthError(data?.message || data?.error || 'Session expired. Please log in again.');
  }

  if (!res.ok) {
    throw new Error(data?.error || data?.message || `Request failed (${res.status})`);
  }

  return data;
}
