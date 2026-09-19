import express from 'express';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../config/firebase.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import logger from '../config/logger.js';

/**
 * First-party site analytics.
 *
 * POST /api/analytics/ping — public beacon called by the frontend on page
 * views and heartbeats. Writes session + daily counters to Firestore.
 *
 * GET /api/admin/analytics — admin-only summary: visitors online now,
 * today/7-day pageviews + uniques, top pages, recent sessions.
 *
 * No PII beyond a salted hash of the client IP (for rough session sanity) and
 * a truncated user-agent. Session IDs are client-generated randoms, not
 * cookies or accounts.
 */

const router = express.Router();

const sessions = () => db.collection('analyticsSessions');
const daily = () => db.collection('analyticsDaily');

// Generous limiter: heartbeats fire every ~45s per tab + pageviews.
const analyticsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
});

const SESSION_ID_RE = /^[a-zA-Z0-9_-]{8,64}$/;
const LIVE_WINDOW_MS = 3 * 60 * 1000; // session seen in last 3 min = "online now"

const hashIp = (ip) =>
  crypto.createHash('sha256')
    .update(`${ip || ''}|${process.env.ANALYTICS_SALT || 'crownmania-analytics'}`)
    .digest('hex')
    .slice(0, 16);

/**
 * POST /api/analytics/ping
 * { sessionId, type: 'pageview'|'heartbeat', path, referrer }
 */
router.post('/ping', analyticsLimiter, async (req, res) => {
  try {
    const { sessionId, type, path: pagePath, referrer } = req.body || {};

    if (!SESSION_ID_RE.test(String(sessionId || ''))) {
      return res.status(400).json({ error: 'invalid sessionId' });
    }
    if (!['pageview', 'heartbeat'].includes(type)) {
      return res.status(400).json({ error: 'invalid type' });
    }

    // Normalize the path — must be a same-site path, capped length.
    let cleanPath = String(pagePath || '/');
    if (!cleanPath.startsWith('/')) cleanPath = `/${cleanPath}`;
    cleanPath = cleanPath.slice(0, 200);

    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    const sessionRef = sessions().doc(sessionId);

    const snap = await sessionRef.get();
    const isNew = !snap.exists;

    const update = {
      lastSeen: now,
      lastPath: cleanPath,
      ipHash: hashIp(req.ip || req.headers['x-forwarded-for']),
      ua: String(req.headers['user-agent'] || '').slice(0, 200),
    };
    if (type === 'pageview') {
      update.pageviews = (snap.data()?.pageviews || 0) + 1;
    }
    if (isNew) {
      update.firstSeen = now;
      update.referrer = String(referrer || '').slice(0, 300);
    }

    const dailyUpdate = {
      sessions: { [sessionId]: now },
      [`pages.${cleanPath}`]: FieldValue.increment(type === 'pageview' ? 1 : 0),
    };
    if (type === 'pageview') {
      dailyUpdate.pageviews = FieldValue.increment(1);
    }

    await Promise.all([
      sessionRef.set(update, { merge: true }),
      daily().doc(day).set(dailyUpdate, { merge: true }),
    ]);

    res.json({ ok: true });
  } catch (error) {
    logger.error('Analytics ping error:', error.message);
    // Never let analytics break the visitor experience
    res.json({ ok: false });
  }
});

/**
 * GET /api/admin/analytics
 * Live + recent traffic summary for the admin dashboard.
 */
router.get('/', requireAdmin, async (req, res) => {
  try {
    const now = Date.now();
    const liveCutoff = new Date(now - LIVE_WINDOW_MS);
    const today = new Date().toISOString().slice(0, 10);

    const [liveSnap, recentSnap, dailySnap] = await Promise.all([
      sessions().where('lastSeen', '>=', liveCutoff).get(),
      sessions().orderBy('lastSeen', 'desc').limit(15).get(),
      daily().orderBy('__name__', 'desc').limit(7).get(),
    ]);

    const liveSessions = liveSnap.docs.map(d => {
      const s = d.data();
      return {
        id: d.id,
        lastPath: s.lastPath,
        lastSeen: s.lastSeen?.toDate?.()?.toISOString() || null,
        pageviews: s.pageviews || 0,
        referrer: s.referrer || null,
        ua: s.ua || null,
      };
    });

    // Daily counters for the last 7 days
    const days = {};
    const topPageCounts = {};
    for (const doc of dailySnap.docs) {
      const d = doc.data();
      const uniqueCount = Object.keys(d.sessions || {}).length;
      days[doc.id] = {
        pageviews: d.pageviews || 0,
        uniques: uniqueCount,
      };
      for (const [path, count] of Object.entries(d.pages || {})) {
        topPageCounts[path] = (topPageCounts[path] || 0) + (count || 0);
      }
    }

    const topPages = Object.entries(topPageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, count]) => ({ path, views: count }));

    const recentSessions = recentSnap.docs.map(d => {
      const s = d.data();
      return {
        id: d.id,
        lastPath: s.lastPath,
        lastSeen: s.lastSeen?.toDate?.()?.toISOString() || null,
        firstSeen: s.firstSeen?.toDate?.()?.toISOString() || null,
        pageviews: s.pageviews || 0,
        referrer: s.referrer || null,
        ua: s.ua || null,
      };
    });

    res.json({
      live: {
        count: liveSessions.length,
        sessions: liveSessions,
        windowMinutes: LIVE_WINDOW_MS / 60000,
      },
      today: days[today] || { pageviews: 0, uniques: 0 },
      last7Days: Object.entries(days)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, v]) => ({ date, ...v })),
      topPages,
      recentSessions,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Admin analytics error:', error);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

export default router;
