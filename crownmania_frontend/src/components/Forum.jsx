import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaThumbsUp, FaThumbsDown, FaFire, FaClock } from 'react-icons/fa';

const ForumSection = styled.section`
  min-height: 100vh;
  padding: 10rem 2rem;
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
  margin-bottom: 4rem;
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
  background: ${props => props.$active ? 'rgba(0, 163, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)'};
  border: 1px solid ${props => props.$active ? 'var(--vault-accent)' : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 8px;
  color: ${props => props.$active ? 'var(--vault-accent)' : 'rgba(255, 255, 255, 0.6)'};
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
  margin-bottom: 4rem;
  padding: 2.5rem;
  background: var(--vault-bg);
  backdrop-filter: blur(var(--vault-blur));
  -webkit-backdrop-filter: blur(var(--vault-blur));
  border: 1px solid var(--vault-border);
  border-radius: 20px;
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
  margin-bottom: 1.5rem;
  resize: none;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: var(--vault-accent);
    background: rgba(255, 255, 255, 0.05);
  }
`;

const SubmitButton = styled(motion.button)`
  padding: 1rem 2.5rem;
  background: var(--vault-accent);
  border: none;
  border-radius: 10px;
  color: #000;
  font-family: var(--font-secondary);
  font-size: 0.8rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Post = styled(motion.div)`
  padding: 2.5rem;
  background: var(--vault-bg);
  backdrop-filter: blur(var(--vault-blur));
  -webkit-backdrop-filter: blur(var(--vault-blur));
  border: 1px solid var(--vault-border);
  border-radius: 20px;
  margin-bottom: 1.5rem;
  transition: all 0.4s ease;

  &:hover {
    border-color: var(--vault-accent);
    transform: translateX(10px);
    background: rgba(0, 163, 255, 0.05);
  }
`;

const PostContent = styled.p`
  font-family: var(--font-secondary);
  font-size: 1.1rem;
  line-height: 1.7;
  color: #fff;
  margin-bottom: 1.5rem;
  font-weight: 400;
`;

const PostActions = styled.div`
  display: flex;
  gap: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
`;

const ActionButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  font-family: var(--font-secondary);
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    color: var(--vault-accent);
  }

  ${props => props.$active && `
    color: var(--vault-accent);
  `}
`;

const Forum = () => {
  const [filter, setFilter] = useState('trending');
  const [posts, setPosts] = useState([
    {
      id: 1,
      content: 'This is an amazing platform! Love the design and functionality.',
      likes: 15,
      dislikes: 2,
      timestamp: new Date('2024-12-14T10:00:00'),
      userVote: null
    },
    {
      id: 2,
      content: 'Looking forward to the next drop! When can we expect it?',
      likes: 8,
      dislikes: 1,
      timestamp: new Date('2024-12-14T11:30:00'),
      userVote: null
    }
  ]);
  const [newPost, setNewPost] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;

    const post = {
      id: Date.now(),
      content: newPost,
      likes: 0,
      dislikes: 0,
      timestamp: new Date(),
      userVote: null
    };

    setPosts([post, ...posts]);
    setNewPost('');
  };

  const handleVote = (postId, voteType) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        const removeExistingVote = () => {
          if (post.userVote === 'like') post.likes--;
          if (post.userVote === 'dislike') post.dislikes--;
        };

        if (post.userVote === voteType) {
          // Remove vote if clicking the same button
          removeExistingVote();
          return { ...post, userVote: null };
        } else {
          // Change vote
          removeExistingVote();
          if (voteType === 'like') post.likes++;
          if (voteType === 'dislike') post.dislikes++;
          return { ...post, userVote: voteType };
        }
      }
      return post;
    }));
  };

  const sortedPosts = [...posts].sort((a, b) => {
    if (filter === 'trending') {
      return (b.likes - b.dislikes) - (a.likes - a.dislikes);
    }
    return b.timestamp - a.timestamp;
  });

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
              COMMUNITY ARCHIVE
            </motion.h2>
          </TitleGroup>
          <FilterContainer>
            <FilterButton
              $active={filter === 'trending'}
              onClick={() => setFilter('trending')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaFire size={12} /> High Frequency
            </FilterButton>
            <FilterButton
              $active={filter === 'current'}
              onClick={() => setFilter('current')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaClock size={12} /> Genesis Order
            </FilterButton>
          </FilterContainer>
        </ForumHeader>

        <PostForm onSubmit={handleSubmit}>
          <TextArea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="Log your transmission to the community ledger..."
          />
          <SubmitButton
            type="submit"
            disabled={!newPost.trim()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            AUTHORIZE POST
          </SubmitButton>
        </PostForm>

        <PostsContainer>
          <AnimatePresence>
            {sortedPosts.map(post => (
              <Post
                key={post.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                <PostContent>{post.content}</PostContent>
                <PostActions>
                  <ActionButton
                    onClick={() => handleVote(post.id, 'like')}
                    $active={post.userVote === 'like'}
                  >
                    <FaThumbsUp size={14} /> {post.likes}
                  </ActionButton>
                  <ActionButton
                    onClick={() => handleVote(post.id, 'dislike')}
                    $active={post.userVote === 'dislike'}
                  >
                    <FaThumbsDown size={14} /> {post.dislikes}
                  </ActionButton>
                </PostActions>
              </Post>
            ))}
          </AnimatePresence>
        </PostsContainer>
      </ForumContainer>
    </ForumSection>
  );
};

export default Forum;
