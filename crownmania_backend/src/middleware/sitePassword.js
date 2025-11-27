const sitePassword = process.env.SITE_PASSWORD || 'your-default-password';

export const requireSitePassword = (req, res, next) => {
  const providedPassword = req.headers['x-site-password'];
  
  if (!providedPassword || providedPassword !== sitePassword) {
    return res.status(401).json({ error: 'Invalid site password' });
  }
  
  next();
};
