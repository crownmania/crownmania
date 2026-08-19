/**
 * Forum service — public forum, no login required.
 *
 * Anyone can post, reply, and vote. Votes are deduped per anonymous browser
 * ID (generated once and stored in localStorage). Rate limiting on the
 * backend prevents spam. If the backend is unreachable, falls back to
 * localStorage so the forum remains usable.
 */

const isDev = import.meta.env.DEV;
const API_BASE_URL =
  import.meta.env.VITE_API_URL || (isDev ? 'http://localhost:5001' : 'https://crownmania-backend-production.up.railway.app');

const LS_POSTS_KEY = 'crownmania_forum_posts';
const LS_REPLIES_KEY = 'crownmania_forum_replies';
const LS_VOTES_KEY = 'crownmania_forum_votes';
const LS_VOTER_ID_KEY = 'crownmania_forum_voter_id';

const MAX_POST_LENGTH = 1000;
const MAX_REPLY_LENGTH = 500;

// ---------- Anonymous voter ID (generated once per browser) ----------
const getVoterId = () => {
  try {
    let id = localStorage.getItem(LS_VOTER_ID_KEY);
    if (!id) {
      id = `v_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(LS_VOTER_ID_KEY, id);
    }
    return id;
  } catch {
    return `v_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  }
};

// ---------- localStorage helpers (fallback) ----------
const lsRead = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const lsWrite = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn('forumService: localStorage write failed', err);
  }
};

const lsReadObj = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const lsWriteObj = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn('forumService: localStorage write failed', err);
  }
};

// ---------- HTTP helper ----------
const http = async (path, options = {}) => {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON response */
  }
  if (!res.ok) {
    const msg = body?.error || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
};

// ---------- Author helpers ----------
export const buildAuthor = (user, walletAddress) => {
  if (user && (user.name || user.email || user.nickname)) {
    return {
      name: user.name || user.nickname || (user.email ? user.email.split('@')[0] : 'Member'),
      address: walletAddress || user.address || null,
      profileImage: user.profileImage || null,
    };
  }
  if (walletAddress) {
    return { name: 'Member', address: walletAddress, profileImage: null };
  }
  return null;
};

export const shortAddress = (address) => {
  if (!address) return '';
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// ---------- Vote tracking (localStorage, for offline fallback) ----------
const getUserVoteLocal = (postId) => {
  const votes = lsReadObj(LS_VOTES_KEY);
  return votes[postId] || null;
};

const setUserVoteLocal = (postId, voteType) => {
  const votes = lsReadObj(LS_VOTES_KEY);
  if (voteType) votes[postId] = voteType;
  else delete votes[postId];
  lsWriteObj(LS_VOTES_KEY, votes);
};

// ---------- Posts ----------
export const fetchPosts = async () => {
  try {
    const data = await http('/api/forum/posts');
    const posts = data.posts || [];
    lsWrite(LS_POSTS_KEY, posts);
    return { posts, source: 'backend' };
  } catch (err) {
    console.warn('forumService: fetchPosts falling back to localStorage', err.message);
    return { posts: lsRead(LS_POSTS_KEY), source: 'local' };
  }
};

export const fetchUserVote = async (postId) => {
  try {
    const data = await http(`/api/forum/posts/${postId}/vote?voterId=${encodeURIComponent(getVoterId())}`);
    return data.userVote || null;
  } catch {
    return getUserVoteLocal(postId);
  }
};

export const createPost = async (content, authorName) => {
  if (!content || !content.trim()) throw new Error('Content is required');

  const cleanContent = content.trim().slice(0, MAX_POST_LENGTH);
  const cleanName = (authorName || '').trim().slice(0, 40) || 'Anonymous';

  try {
    const data = await http('/api/forum/posts', {
      method: 'POST',
      body: JSON.stringify({ content: cleanContent, authorName: cleanName }),
    });
    return data;
  } catch (err) {
    console.warn('forumService: createPost falling back to localStorage', err.message);
    const posts = lsRead(LS_POSTS_KEY);
    const post = {
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      content: cleanContent,
      authorName: cleanName,
      authorImage: null,
      likes: 0,
      dislikes: 0,
      replyCount: 0,
      createdAt: Date.now(),
    };
    posts.unshift(post);
    lsWrite(LS_POSTS_KEY, posts);
    return post;
  }
};

export const votePost = async (postId, voteType) => {
  try {
    const data = await http(`/api/forum/posts/${postId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ voteType, voterId: getVoterId() }),
    });
    return data;
  } catch (err) {
    console.warn('forumService: votePost falling back to localStorage', err.message);
    const previous = getUserVoteLocal(postId);
    let likeDelta = 0;
    let dislikeDelta = 0;
    let newVote = null;
    if (previous === voteType) {
      if (previous === 'like') likeDelta = -1;
      if (previous === 'dislike') dislikeDelta = -1;
      setUserVoteLocal(postId, null);
      newVote = null;
    } else {
      if (previous === 'like') likeDelta = -1;
      if (previous === 'dislike') dislikeDelta = -1;
      if (voteType === 'like') likeDelta += 1;
      if (voteType === 'dislike') dislikeDelta += 1;
      setUserVoteLocal(postId, voteType);
      newVote = voteType;
    }
    const posts = lsRead(LS_POSTS_KEY).map((p) =>
      p.id === postId
        ? {
            ...p,
            likes: Math.max(0, (Number(p.likes) || 0) + likeDelta),
            dislikes: Math.max(0, (Number(p.dislikes) || 0) + dislikeDelta),
          }
        : p
    );
    lsWrite(LS_POSTS_KEY, posts);
    const updated = posts.find((p) => p.id === postId) || {};
    return {
      likes: updated.likes || 0,
      dislikes: updated.dislikes || 0,
      userVote: newVote,
    };
  }
};

// ---------- Replies ----------
export const fetchReplies = async (postId) => {
  try {
    const data = await http(`/api/forum/posts/${postId}/replies`);
    return data.replies || [];
  } catch (err) {
    console.warn('forumService: fetchReplies falling back to localStorage', err.message);
    return lsRead(LS_REPLIES_KEY).filter((r) => r.postId === postId);
  }
};

export const createReply = async (postId, content, authorName) => {
  if (!content || !content.trim()) throw new Error('Reply content is required');

  const cleanContent = content.trim().slice(0, MAX_REPLY_LENGTH);
  const cleanName = (authorName || '').trim().slice(0, 40) || 'Anonymous';

  try {
    const data = await http(`/api/forum/posts/${postId}/replies`, {
      method: 'POST',
      body: JSON.stringify({ content: cleanContent, authorName: cleanName }),
    });
    return data;
  } catch (err) {
    console.warn('forumService: createReply falling back to localStorage', err.message);
    const replies = lsRead(LS_REPLIES_KEY);
    const reply = {
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      postId,
      content: cleanContent,
      authorName: cleanName,
      authorImage: null,
      createdAt: Date.now(),
    };
    replies.push(reply);
    lsWrite(LS_REPLIES_KEY, replies);
    const posts = lsRead(LS_POSTS_KEY).map((p) =>
      p.id === postId ? { ...p, replyCount: (Number(p.replyCount) || 0) + 1 } : p
    );
    lsWrite(LS_POSTS_KEY, posts);
    return reply;
  }
};

// ---------- Formatting helpers ----------
export const timeAgo = (timestamp) => {
  if (!timestamp) return 'just now';
  const now = Date.now();
  const diff = Math.max(0, now - timestamp);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk}w ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  const yr = Math.floor(day / 365);
  return `${yr}y ago`;
};
