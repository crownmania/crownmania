/**
 * Site Password Middleware
 *
 * SECURITY FIX (S12): Removed hardcoded fallback password ('your-default-password').
 * In production, the server refuses to use this middleware without a configured secret.
 */
const sitePassword = process.env.SITE_PASSWORD;

if (process.env.NODE_ENV === 'production' && !sitePassword) {
  throw new Error('FATAL: SITE_PASSWORD env var is required in production when using sitePassword middleware');
}

export const requireSitePassword = (req, res, next) => {
  if (!sitePassword) {
    // In development without SITE_PASSWORD, skip the check with a warning
    console.warn('[DEV] SITE_PASSWORD not set — sitePassword middleware is a no-op');
    return next();
  }

  const providedPassword = req.headers['x-site-password'];

  if (!providedPassword || providedPassword !== sitePassword) {
    return res.status(401).json({ error: 'Invalid site password' });
  }

  next();
};
