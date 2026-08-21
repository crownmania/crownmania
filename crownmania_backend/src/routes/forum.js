import express from 'express';
import rateLimit from 'express-rate-limit';
import { FieldValue } from 'firebase-admin/firestore';
import { db, firebaseReady } from '../config/firebase.js';
import { logUserAction } from '../services/userActivityService.js';
import logger from '../config/logger.js';

const router = express.Router();

const POSTS_COLLECTION = 'forum_posts';
const REPLIES_COLLECTION = 'forum_replies';
const VOTES_COLLECTION = 'forum_votes';

const MAX_POST_LENGTH = 1000;
const MAX_REPLY_LENGTH = 500;
const MAX_NAME_LENGTH = 40;
const LIST_LIMIT = 200;

// Rate limits (per IP) — spam mitigation. Anyone can post, but not too fast.
const postLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10,
  message: { error: 'Too many posts. Please wait before posting again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const replyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: { error: 'Too many replies. Please wait before posting again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const voteLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60,
  message: { error: 'Too many votes. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Guard middleware: ensure Firebase Admin is available
const requireDb = (req, res, next) => {
  if (!firebaseReady || !db) {
    return res.status(503).json({ error: 'Forum service unavailable.' });
  }
  next();
};

// Basic content sanitization — strip control chars, enforce length
const sanitize = (str, maxLen) => {
  if (typeof str !== 'string') return '';
  // Remove null bytes and control chars (except newlines/tabs)
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').slice(0, maxLen).trim();
};

// Derive a stable anonymous voter ID from the request IP.
// This prevents double-voting from the same browser/IP without requiring login.
const getVoterId = (req) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  return `ip_${String(ip).replace(/[^a-zA-Z0-9.]/g, '_')}`;
};

const tsToMillis = (ts) => {
  if (!ts) return Date.now();
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts._toMillis === 'function') return ts._toMillis();
  if (typeof ts === 'number') return ts;
  return Date.now();
};

const serializePost = (docSnap) => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    content: data.content || '',
    authorName: data.authorName || 'Anonymous',
    authorImage: data.authorImage || null,
    likes: Number(data.likes) || 0,
    dislikes: Number(data.dislikes) || 0,
    replyCount: Number(data.replyCount) || 0,
    createdAt: tsToMillis(data.createdAt),
  };
};

const serializeReply = (docSnap) => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    content: data.content || '',
    authorName: data.authorName || 'Anonymous',
    authorImage: data.authorImage || null,
    createdAt: tsToMillis(data.createdAt),
  };
};

/**
 * GET /api/forum/posts
 * Public — list all posts ordered by createdAt desc.
 */
router.get('/posts', requireDb, async (req, res) => {
  try {
    const snap = await db
      .collection(POSTS_COLLECTION)
      .orderBy('createdAt', 'desc')
      .limit(LIST_LIMIT)
      .get();
    const posts = snap.docs.map(serializePost);
    res.json({ posts });
  } catch (err) {
    logger.error('Forum list posts error:', err.message);
    res.status(500).json({ error: 'Failed to load posts.' });
  }
});

/**
 * POST /api/forum/posts
 * Public — anyone can create a post. Rate-limited per IP.
 * Body: { content, authorName?, authorImage? }
 */
router.post('/posts', requireDb, postLimiter, async (req, res) => {
  try {
    const { content, authorName, authorImage } = req.body;

    const cleanContent = sanitize(content, MAX_POST_LENGTH);
    if (!cleanContent) {
      return res.status(400).json({ error: 'Post content is required.' });
    }
    if (cleanContent.length < 2) {
      return res.status(400).json({ error: 'Post is too short.' });
    }

    const cleanName = sanitize(authorName, MAX_NAME_LENGTH) || 'Anonymous';
    const cleanImage = typeof authorImage === 'string' ? authorImage.slice(0, 500) : null;

    const payload = {
      content: cleanContent,
      authorName: cleanName,
      authorImage: cleanImage,
      likes: 0,
      dislikes: 0,
      replyCount: 0,
      createdAt: FieldValue.serverTimestamp(),
    };

    const ref = await db.collection(POSTS_COLLECTION).add(payload);
    logger.info(`Forum post created: ${ref.id}`);

    // Record in user activity database (anonymous actor identified by IP/voterId)
    logUserAction({
      walletAddress: getVoterId(req),
      username: cleanName,
      action: 'forum_post',
      category: 'forum',
      description: 'Created a forum post',
      metadata: { postId: ref.id, authorName: cleanName, contentLength: cleanContent.length },
      req,
    });

    res.status(201).json({
      id: ref.id,
      ...payload,
      createdAt: Date.now(),
    });
  } catch (err) {
    logger.error('Forum create post error:', err.message);
    res.status(500).json({ error: 'Failed to create post.' });
  }
});

/**
 * POST /api/forum/posts/:postId/vote
 * Public — toggle like/dislike, deduped per voter (IP-based).
 * Body: { voteType: 'like'|'dislike', voterId? }
 */
router.post('/posts/:postId/vote', requireDb, voteLimiter, async (req, res) => {
  try {
    const { postId } = req.params;
    const { voteType, voterId } = req.body;

    if (voteType !== 'like' && voteType !== 'dislike') {
      return res.status(400).json({ error: "voteType must be 'like' or 'dislike'." });
    }

    // Use client-provided voterId (anonymous browser ID) or fall back to IP
    const vid = sanitize(voterId, 100) || getVoterId(req);
    if (!vid) {
      return res.status(400).json({ error: 'Could not identify voter.' });
    }

    const postRef = db.collection(POSTS_COLLECTION).doc(postId);
    const voteRef = db
      .collection(POSTS_COLLECTION)
      .doc(postId)
      .collection(VOTES_COLLECTION)
      .doc(vid);

    const result = await db.runTransaction(async (txn) => {
      const [postSnap, voteSnap] = await Promise.all([
        txn.get(postRef),
        txn.get(voteRef),
      ]);

      if (!postSnap.exists) {
        throw new Error('NOT_FOUND');
      }

      const data = postSnap.data();
      const likes = Number(data.likes) || 0;
      const dislikes = Number(data.dislikes) || 0;
      const previous = voteSnap.exists ? voteSnap.data().voteType : null;

      let likeDelta = 0;
      let dislikeDelta = 0;
      let newVote = null;

      if (previous === voteType) {
        // Remove vote
        if (previous === 'like') likeDelta = -1;
        if (previous === 'dislike') dislikeDelta = -1;
        txn.delete(voteRef);
        newVote = null;
      } else {
        if (previous === 'like') likeDelta = -1;
        if (previous === 'dislike') dislikeDelta = -1;
        if (voteType === 'like') likeDelta += 1;
        if (voteType === 'dislike') dislikeDelta += 1;
        txn.set(voteRef, { voteType, voterId: vid, createdAt: FieldValue.serverTimestamp() });
        newVote = voteType;
      }

      const updates = {};
      if (likeDelta !== 0) updates.likes = FieldValue.increment(likeDelta);
      if (dislikeDelta !== 0) updates.dislikes = FieldValue.increment(dislikeDelta);
      if (Object.keys(updates).length > 0) {
        txn.update(postRef, updates);
      }

      return {
        likes: Math.max(0, likes + likeDelta),
        dislikes: Math.max(0, dislikes + dislikeDelta),
        userVote: newVote,
      };
    });

    logUserAction({
      walletAddress: vid,
      username: null,
      action: 'forum_vote',
      category: 'forum',
      description: `Voted ${voteType} on post ${postId}`,
      metadata: { postId, voteType, voterId: vid, result },
      req,
    });

    res.json(result);
  } catch (err) {
    if (err.message === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Post not found.' });
    }
    logger.error('Forum vote error:', err.message);
    res.status(500).json({ error: 'Failed to register vote.' });
  }
});

/**
 * GET /api/forum/posts/:postId/vote
 * Public — get the current voter's vote on a post.
 * Query: ?voterId=<anonymousId>
 */
router.get('/posts/:postId/vote', requireDb, async (req, res) => {
  try {
    const { postId } = req.params;
    const voterId = sanitize(req.query.voterId, 100) || getVoterId(req);
    if (!voterId) return res.json({ userVote: null });

    const voteSnap = await db
      .collection(POSTS_COLLECTION)
      .doc(postId)
      .collection(VOTES_COLLECTION)
      .doc(voterId)
      .get();
    res.json({ userVote: voteSnap.exists ? voteSnap.data().voteType : null });
  } catch (err) {
    logger.error('Forum get vote error:', err.message);
    res.status(500).json({ error: 'Failed to get vote.' });
  }
});

/**
 * GET /api/forum/posts/:postId/replies
 * Public — list replies for a post.
 */
router.get('/posts/:postId/replies', requireDb, async (req, res) => {
  try {
    const { postId } = req.params;
    const snap = await db
      .collection(POSTS_COLLECTION)
      .doc(postId)
      .collection(REPLIES_COLLECTION)
      .orderBy('createdAt', 'asc')
      .get();
    const replies = snap.docs.map(serializeReply);
    res.json({ replies });
  } catch (err) {
    logger.error('Forum list replies error:', err.message);
    res.status(500).json({ error: 'Failed to load replies.' });
  }
});

/**
 * POST /api/forum/posts/:postId/replies
 * Public — anyone can reply. Rate-limited per IP.
 * Body: { content, authorName?, authorImage? }
 */
router.post('/posts/:postId/replies', requireDb, replyLimiter, async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, authorName, authorImage } = req.body;

    const cleanContent = sanitize(content, MAX_REPLY_LENGTH);
    if (!cleanContent) {
      return res.status(400).json({ error: 'Reply content is required.' });
    }

    // Verify parent post exists
    const postSnap = await db.collection(POSTS_COLLECTION).doc(postId).get();
    if (!postSnap.exists) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const cleanName = sanitize(authorName, MAX_NAME_LENGTH) || 'Anonymous';
    const cleanImage = typeof authorImage === 'string' ? authorImage.slice(0, 500) : null;

    const payload = {
      content: cleanContent,
      authorName: cleanName,
      authorImage: cleanImage,
      createdAt: FieldValue.serverTimestamp(),
    };

    const ref = await db
      .collection(POSTS_COLLECTION)
      .doc(postId)
      .collection(REPLIES_COLLECTION)
      .add(payload);

    // Increment parent reply count
    try {
      await db
        .collection(POSTS_COLLECTION)
        .doc(postId)
        .update({ replyCount: FieldValue.increment(1) });
    } catch (e) {
      logger.warn('Forum reply: replyCount increment failed', e.message);
    }

    logger.info(`Forum reply on ${postId}: ${ref.id}`);

    logUserAction({
      walletAddress: getVoterId(req),
      username: cleanName,
      action: 'forum_reply',
      category: 'forum',
      description: `Replied to post ${postId}`,
      metadata: { postId, replyId: ref.id, authorName: cleanName, contentLength: cleanContent.length },
      req,
    });

    res.status(201).json({
      id: ref.id,
      ...payload,
      createdAt: Date.now(),
    });
  } catch (err) {
    logger.error('Forum create reply error:', err.message);
    res.status(500).json({ error: 'Failed to create reply.' });
  }
});

export { router as forumRouter };
export default router;
