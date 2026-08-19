import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaThumbsUp,
  FaThumbsDown,
  FaFire,
  FaClock,
  FaCommentDots,
  FaPaperPlane,
  FaSpinner,
  FaExclamationTriangle,
  FaComments,
  FaUserCircle,
} from 'react-icons/fa';
import {
  fetchPosts,
  fetchReplies,
  fetchUserVote,
  createPost,
  createReply,
  votePost,
  timeAgo,
} from '../services/forumService';

const ForumSection = styled.section`
  min-height: 100vh;
  padding: 8rem 2rem 6rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  background: radial-gradient(circle at 10% 30%, rgba(0, 163, 255, 0.03) 0%, transparent 40%);
  overflow: hidden;
`;

const ForumContainer = styled(motion.div)`
  max-width: 1000px;
  width: 100%;
  z-index: 2;
`;

const ForumHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 3rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--vault-border);

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 2rem;
  }
`;

const TitleGroup = styled.div`
  h2 {
    font-size: clamp(2.5rem, 6vw, 3.5rem);
    font-family: var(--font-primary);
    line-height: 1;
    letter-spacing: -0.02em;
    color: #fff;
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  p {
    font-family: var(--font-secondary);
    font-size: 0.8rem;
    color: var(--vault-accent);
    letter-spacing: 0.3em;
    font-weight: 700;
    text-transform: uppercase;
  }
`;

const FilterContainer = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const FilterButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 1.25rem;
  background: ${(props) => (props.$active ? 'rgba(0, 163, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)')};
  border: 1px solid ${(props) => (props.$active ? 'var(--vault-accent)' : 'rgba(255, 255, 255, 0.1)')};
  border-radius: 8px;
  color: ${(props) => (props.$active ? 'var(--vault-accent)' : 'rgba(255, 255, 255, 0.6)')};
  font-family: var(--font-secondary);
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    border-color: var(--vault-accent);
    color: #fff;
  }
`;

const PostForm = styled.form`
  margin-bottom: 3rem;
  padding: 2rem;
  background: var(--vault-bg);
  backdrop-filter: blur(var(--vault-blur));
  -webkit-backdrop-filter: blur(var(--vault-blur));
  border: px solid var(--vault-border);
  border: 1px solid var(--vault-border);
  border-radius: 20px;
`;

const FormTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  font-family: var(--font-secondary);
  font-size: 0.8rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: rgba(255, 255, 255, 0.7);
`;

const NameInput = styled.input`
  width: 100%;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: #fff;
  font-family: var(--font-secondary);
  font-size: 0.9rem;
  margin-bottom: 1rem;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: var(--vault-accent);
    background: rgba(255, 255, 255, 0.05);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 1.25rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: #fff;
  font-family: var(--font-secondary);
  font-size: 1rem;
  margin-bottom: 1rem;
  resize: vertical;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: var(--vault-accent);
    background: rgba(255, 255, 255, 0.05);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
`;

const FormFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
`;

const CharCount = styled.span`
  font-family: var(--font-secondary);
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
  ${(props) => props.$over && 'color: #ff6b6b;'}
`;

const SubmitButton = styled(motion.button)`
  padding: 0.9rem 2rem;
  background: var(--vault-accent);
  border: none;
  border-radius: 10px;
  color: #000;
  font-family: var(--font-secondary);
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.6rem;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const PostsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const Post = styled(motion.div)`
  padding: 2rem;
  background: var(--vault-bg);
  backdrop-filter: blur(var(--vault-blur));
  -webkit-backdrop-filter: blur(var(--vault-blur));
  border: 1px solid var(--vault-border);
  border-radius: 20px;
  transition: border-color 0.3s ease;

  &:hover {
    border-color: rgba(0, 163, 255, 0.4);
  }
`;

const PostMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.85rem;
  margin-bottom: 1.25rem;
`;

const Avatar = styled.div`
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(0, 163, 255, 0.15);
  border: 1px solid var(--vault-border);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  svg {
    color: var(--vault-accent);
    font-size: 1.1rem;
  }
`;

const AuthorInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
`;

const AuthorName = styled.span`
  font-family: var(--font-secondary);
  font-size: 0.9rem;
  font-weight: 700;
  color: #fff;
`;

const AuthorSub = styled.span`
  font-family: var(--font-secondary);
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 0.05em;
`;

const PostContent = styled.p`
  font-family: var(--font-secondary);
  font-size: 1.05rem;
  line-height: 1.7;
  color: #fff;
  margin-bottom: 1.25rem;
  font-weight: 400;
  white-space: pre-wrap;
  word-wrap: break-word;
`;

const PostActions = styled.div`
  display: flex;
  gap: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  flex-wrap: wrap;
`;

const ActionButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  font-family: var(--font-secondary);
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: color 0.3s ease;

  &:hover {
    color: var(--vault-accent);
  }

  ${(props) =>
    props.$active &&
    `
    color: var(--vault-accent);
  `}
`;

const RepliesContainer = styled(motion.div)`
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Reply = styled.div`
  display: flex;
  gap: 0.85rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

const ReplyBody = styled.div`
  flex: 1;
  min-width: 0;
`;

const ReplyMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
  flex-wrap: wrap;
`;

const ReplyAuthor = styled.span`
  font-family: var(--font-secondary);
  font-size: 0.8rem;
  font-weight: 700;
  color: #fff;
`;

const ReplyTime = styled.span`
  font-family: var(--font-secondary);
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.35);
`;

const ReplyContent = styled.p`
  font-family: var(--font-secondary);
  font-size: 0.92rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.85);
  white-space: pre-wrap;
  word-wrap: break-word;
`;

const ReplyForm = styled.form`
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
`;

const ReplyInput = styled.input`
  flex: 1;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: #fff;
  font-family: var(--font-secondary);
  font-size: 0.9rem;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: var(--vault-accent);
    background: rgba(255, 255, 255, 0.05);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
`;

const ReplySendBtn = styled(motion.button)`
  background: var(--vault-accent);
  border: none;
  border-radius: 10px;
  padding: 0 1.1rem;
  color: #000;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const StatusBox = styled.div`
  padding: 3rem 2rem;
  text-align: center;
  font-family: var(--font-secondary);
  color: rgba(255, 255, 255, 0.5);
  border: 1px dashed rgba(255, 255, 255, 0.1);
  border-radius: 16px;
`;

const Spinner = styled(FaSpinner)`
  animation: spin 1s linear infinite;
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const ErrorBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  margin-bottom: 1.5rem;
  background: rgba(255, 107, 107, 0.08);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: 12px;
  color: #ff9b9b;
  font-family: var(--font-secondary);
  font-size: 0.85rem;
`;

const SourceBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-family: var(--font-secondary);
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: rgba(255, 255, 255, 0.35);
  margin-left: 1rem;
`;

const MAX_POST_LENGTH = 1000;
const MAX_REPLY_LENGTH = 500;
const LS_NAME_KEY = 'crownmania_forum_name';

const Forum = () => {
  const [filter, setFilter] = useState('trending');
  const [posts, setPosts] = useState([]);
  const [source, setSource] = useState('backend');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newPost, setNewPost] = useState('');
  const [authorName, setAuthorName] = useState(() => {
    try {
      return localStorage.getItem(LS_NAME_KEY) || '';
    } catch {
      return '';
    }
  });
  const [submitting, setSubmitting] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState({});
  const [repliesByPost, setRepliesByPost] = useState({});
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replySubmitting, setReplySubmitting] = useState({});
  const [userVotes, setUserVotes] = useState({});
  const [voting, setVoting] = useState({});
  const pollRef = useRef(null);

  const refreshPosts = useCallback(async () => {
    try {
      const { posts: fetched, source: src } = await fetchPosts();
      setPosts(fetched);
      setSource(src);
      setError(null);
    } catch (err) {
      setError('Failed to load forum posts.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Hydrate the current user's votes (only on initial load)
  const hydrateVotes = useCallback(async (postList) => {
    if (postList.length === 0) return;
    const votes = {};
    await Promise.all(
      postList.map(async (p) => {
        try {
          const v = await fetchUserVote(p.id);
          if (v) votes[p.id] = v;
        } catch {
          /* ignore */
        }
      })
    );
    setUserVotes(votes);
  }, []);

  // Initial load (with vote hydration) + polling for live post updates
  useEffect(() => {
    setLoading(true);
    (async () => {
      const { posts: fetched } = await fetchPosts();
      setPosts(fetched);
      setLoading(false);
      hydrateVotes(fetched);
    })();
    pollRef.current = setInterval(refreshPosts, 15000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [refreshPosts, hydrateVotes]);

  const toggleReplies = useCallback(async (postId) => {
    setExpandedReplies((prev) => ({ ...prev, [postId]: !prev[postId] }));
    try {
      const replies = await fetchReplies(postId);
      setRepliesByPost((prev) => ({ ...prev, [postId]: replies }));
    } catch (err) {
      setError('Failed to load replies.');
    }
  }, []);

  const refreshReplies = useCallback(async (postId) => {
    try {
      const replies = await fetchReplies(postId);
      setRepliesByPost((prev) => ({ ...prev, [postId]: replies }));
    } catch {
      /* ignore */
    }
  }, []);

  const sortedPosts = useMemo(() => {
    return [...posts].sort((a, b) => {
      if (filter === 'trending') {
        const scoreA = (a.likes || 0) - (a.dislikes || 0);
        const scoreB = (b.likes || 0) - (b.dislikes || 0);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return (b.createdAt || 0) - (a.createdAt || 0);
      }
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }, [posts, filter]);

  const handleNameChange = (e) => {
    const val = e.target.value.slice(0, 40);
    setAuthorName(val);
    try {
      localStorage.setItem(LS_NAME_KEY, val);
    } catch {
      /* ignore */
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = newPost.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await createPost(trimmed, authorName);
      setNewPost('');
      await refreshPosts();
    } catch (err) {
      setError(err.message || 'Failed to post. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (postId, voteType) => {
    if (voting[postId]) return;
    setVoting((prev) => ({ ...prev, [postId]: true }));
    // Optimistic UI update
    const previous = userVotes[postId] || null;
    setUserVotes((prev) => {
      const next = { ...prev };
      if (previous === voteType) delete next[postId];
      else next[postId] = voteType;
      return next;
    });
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        let likes = p.likes || 0;
        let dislikes = p.dislikes || 0;
        if (previous === 'like') likes -= 1;
        if (previous === 'dislike') dislikes -= 1;
        if (previous !== voteType) {
          if (voteType === 'like') likes += 1;
          if (voteType === 'dislike') dislikes += 1;
        }
        return { ...p, likes: Math.max(0, likes), dislikes: Math.max(0, dislikes) };
      })
    );
    try {
      const result = await votePost(postId, voteType);
      if (result) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, likes: result.likes ?? p.likes, dislikes: result.dislikes ?? p.dislikes }
              : p
          )
        );
        setUserVotes((prev) => {
          const next = { ...prev };
          if (result.userVote) next[postId] = result.userVote;
          else delete next[postId];
          return next;
        });
      }
    } catch (err) {
      // revert on failure
      setUserVotes((prev) => {
        const next = { ...prev };
        if (previous) next[postId] = previous;
        else delete next[postId];
        return next;
      });
      setError(err.message || 'Vote failed. Please try again.');
    } finally {
      setVoting((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleReplySubmit = async (e, postId) => {
    e.preventDefault();
    const trimmed = (replyDrafts[postId] || '').trim();
    if (!trimmed || replySubmitting[postId]) return;
    setReplySubmitting((prev) => ({ ...prev, [postId]: true }));
    setError(null);
    try {
      await createReply(postId, trimmed, authorName);
      setReplyDrafts((prev) => ({ ...prev, [postId]: '' }));
      await Promise.all([refreshReplies(postId), refreshPosts()]);
    } catch (err) {
      setError(err.message || 'Failed to post reply.');
    } finally {
      setReplySubmitting((prev) => ({ ...prev, [postId]: false }));
    }
  };

  return (
    <ForumSection id="forum">
      <ForumContainer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <ForumHeader>
          <TitleGroup>
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              Public Access Ledger
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <FaComments size={32} /> COMMUNITY FORUM
            </motion.h2>
          </TitleGroup>
          <FilterContainer>
            <FilterButton
              $active={filter === 'trending'}
              onClick={() => setFilter('trending')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaFire size={12} /> Trending
            </FilterButton>
            <FilterButton
              $active={filter === 'recent'}
              onClick={() => setFilter('recent')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaClock size={12} /> Recent
            </FilterButton>
          </FilterContainer>
        </ForumHeader>

        <AnimatePresence>
          {error && (
            <ErrorBanner
              as={motion.div}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <FaExclamationTriangle /> {error}
            </ErrorBanner>
          )}
        </AnimatePresence>

        <PostForm onSubmit={handleSubmit}>
          <FormTitle>
            <FaPaperPlane size={12} /> New Post
          </FormTitle>
          <NameInput
            value={authorName}
            onChange={handleNameChange}
            placeholder="Your name (optional — defaults to Anonymous)"
            maxLength={40}
          />
          <TextArea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value.slice(0, MAX_POST_LENGTH))}
            placeholder="Share your thoughts with the community..."
            maxLength={MAX_POST_LENGTH}
          />
          <FormFooter>
            <CharCount $over={newPost.length > MAX_POST_LENGTH - 50}>
              {newPost.length}/{MAX_POST_LENGTH}
            </CharCount>
            <SubmitButton
              type="submit"
              disabled={!newPost.trim() || submitting}
              whileHover={{ scale: submitting ? 1 : 1.02 }}
              whileTap={{ scale: submitting ? 1 : 0.98 }}
            >
              {submitting ? <Spinner size={12} /> : <FaPaperPlane size={12} />}
              {submitting ? 'Posting...' : 'Post'}
            </SubmitButton>
          </FormFooter>
        </PostForm>

        <div style={{ marginBottom: '1.5rem' }}>
          <SourceBadge>
            {source === 'local' ? 'Offline mode (saved locally)' : 'Live'} · {posts.length} posts
          </SourceBadge>
          {source === 'local' && (
            <div
              style={{
                fontFamily: 'var(--font-secondary)',
                fontSize: '0.7rem',
                color: 'rgba(255, 107, 107, 0.7)',
                marginTop: '0.5rem',
              }}
            >
              Backend unreachable — showing locally cached posts. Start the backend for live sync.
            </div>
          )}
        </div>

        {loading ? (
          <StatusBox>
            <Spinner size={20} style={{ marginBottom: '1rem' }} />
            <div>Loading forum...</div>
          </StatusBox>
        ) : sortedPosts.length === 0 ? (
          <StatusBox>
            <FaComments size={28} style={{ marginBottom: '1rem', opacity: 0.4 }} />
            <div>No posts yet. Be the first to start the conversation!</div>
          </StatusBox>
        ) : (
          <PostsContainer>
            <AnimatePresence>
              {sortedPosts.map((post) => {
                const replies = repliesByPost[post.id] || [];
                const isExpanded = !!expandedReplies[post.id];
                const userVote = userVotes[post.id] || null;
                return (
                  <Post
                    key={post.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                  >
                    <PostMeta>
                      <Avatar>
                        {post.authorImage ? (
                          <img src={post.authorImage} alt={post.authorName} />
                        ) : (
                          <FaUserCircle />
                        )}
                      </Avatar>
                      <AuthorInfo>
                        <AuthorName>{post.authorName}</AuthorName>
                        <AuthorSub>{timeAgo(post.createdAt)}</AuthorSub>
                      </AuthorInfo>
                    </PostMeta>

                    <PostContent>{post.content}</PostContent>

                    <PostActions>
                      <ActionButton
                        onClick={() => handleVote(post.id, 'like')}
                        $active={userVote === 'like'}
                        whileTap={{ scale: 0.9 }}
                        disabled={!!voting[post.id]}
                        title="Upvote"
                      >
                        <FaThumbsUp size={14} /> {post.likes || 0}
                      </ActionButton>
                      <ActionButton
                        onClick={() => handleVote(post.id, 'dislike')}
                        $active={userVote === 'dislike'}
                        whileTap={{ scale: 0.9 }}
                        disabled={!!voting[post.id]}
                        title="Downvote"
                      >
                        <FaThumbsDown size={14} /> {post.dislikes || 0}
                      </ActionButton>
                      <ActionButton
                        onClick={() => toggleReplies(post.id)}
                        whileTap={{ scale: 0.9 }}
                        $active={isExpanded}
                      >
                        <FaCommentDots size={14} /> {post.replyCount || replies.length || 0} Replies
                      </ActionButton>
                    </PostActions>

                    <AnimatePresence>
                      {isExpanded && (
                        <RepliesContainer
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          {replies.length === 0 && (
                            <div
                              style={{
                                fontFamily: 'var(--font-secondary)',
                                fontSize: '0.8rem',
                                color: 'rgba(255,255,255,0.4)',
                              }}
                            >
                              No replies yet.
                            </div>
                          )}
                          {replies.map((reply) => (
                            <Reply key={reply.id}>
                              <Avatar style={{ width: 30, height: 30 }}>
                                {reply.authorImage ? (
                                  <img src={reply.authorImage} alt={reply.authorName} />
                                ) : (
                                  <FaUserCircle size={12} />
                                )}
                              </Avatar>
                              <ReplyBody>
                                <ReplyMeta>
                                  <ReplyAuthor>{reply.authorName}</ReplyAuthor>
                                  <ReplyTime>· {timeAgo(reply.createdAt)}</ReplyTime>
                                </ReplyMeta>
                                <ReplyContent>{reply.content}</ReplyContent>
                              </ReplyBody>
                            </Reply>
                          ))}

                          <ReplyForm onSubmit={(e) => handleReplySubmit(e, post.id)}>
                            <ReplyInput
                              value={replyDrafts[post.id] || ''}
                              onChange={(e) =>
                                setReplyDrafts((prev) => ({
                                  ...prev,
                                  [post.id]: e.target.value.slice(0, MAX_REPLY_LENGTH),
                                }))
                              }
                              placeholder="Write a reply..."
                              maxLength={MAX_REPLY_LENGTH}
                              disabled={!!replySubmitting[post.id]}
                            />
                            <ReplySendBtn
                              type="submit"
                              disabled={
                                !(replyDrafts[post.id] || '').trim() || !!replySubmitting[post.id]
                              }
                              whileTap={{ scale: 0.9 }}
                            >
                              {replySubmitting[post.id] ? <Spinner size={12} /> : <FaPaperPlane size={12} />}
                            </ReplySendBtn>
                          </ReplyForm>
                        </RepliesContainer>
                      )}
                    </AnimatePresence>
                  </Post>
                );
              })}
            </AnimatePresence>
          </PostsContainer>
        )}
      </ForumContainer>
    </ForumSection>
  );
};

export default Forum;
