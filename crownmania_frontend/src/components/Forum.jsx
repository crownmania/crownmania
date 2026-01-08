import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaThumbsUp, FaThumbsDown, FaFire, FaClock } from 'react-icons/fa';

const ForumSection = styled.section`
  min-height: 100vh;
  padding: 6rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
`;

const ForumContainer = styled.div`
  max-width: 1200px;
  width: 100%;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
  border-radius: 24px;
  padding: 3rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  z-index: 1;
`;

const ForumHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Title = styled.h2`
  font-size: 2.5rem;
  margin: 0;
  background: linear-gradient(135deg, #FFFFFF, #0066FF);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const FilterContainer = styled.div`
  display: flex;
  gap: 1rem;
`;

const FilterButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;

  &.active {
    background: rgba(0, 102, 255, 0.2);
    border: 1px solid rgba(0, 102, 255, 0.3);
  }

  &:hover {
    background: rgba(0, 102, 255, 0.15);
    border-color: rgba(0, 102, 255, 0.2);
  }
`;

const PostForm = styled.form`
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: white;
  margin-bottom: 1rem;
  resize: vertical;
  font-size: 1rem;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: #0066FF;
    box-shadow: 0 0 10px rgba(0, 102, 255, 0.2);
  }
`;

const SubmitButton = styled(motion.button)`
  padding: 1rem 2rem;
  background: #0066FF;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: #0052CC;
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const PostsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Post = styled(motion.div)`
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  transition: all 0.3s ease;

  &:hover {
    border-color: rgba(0, 102, 255, 0.2);
    box-shadow: 0 0 20px rgba(0, 102, 255, 0.1);
  }
`;

const PostContent = styled.p`
  margin-bottom: 1rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.9);
`;

const PostActions = styled.div`
  display: flex;
  gap: 1rem;
  color: rgba(255, 255, 255, 0.6);
`;

const ActionButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  transition: color 0.3s ease;

  &:hover {
    color: #0066FF;
  }
`;

const GlowOrb = styled(motion.div)`
  position: absolute;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: radial-gradient(circle at center, rgba(0, 102, 255, 0.2), transparent 70%);
  filter: blur(40px);
  z-index: 0;
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
      <GlowOrb
        initial={{ x: 200, y: -200 }}
        animate={{
          x: [200, -200, 200],
          y: [-200, 200, -200]
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
      />

      <ForumContainer>
        <ForumHeader>
          <Title>Community Forum</Title>
          <FilterContainer>
            <FilterButton
              className={filter === 'trending' ? 'active' : ''}
              onClick={() => setFilter('trending')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaFire /> Trending
            </FilterButton>
            <FilterButton
              className={filter === 'current' ? 'active' : ''}
              onClick={() => setFilter('current')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaClock /> Current
            </FilterButton>
          </FilterContainer>
        </ForumHeader>

        <PostForm onSubmit={handleSubmit}>
          <TextArea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="Share your thoughts..."
          />
          <SubmitButton
            type="submit"
            disabled={!newPost.trim()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Post
          </SubmitButton>
        </PostForm>

        <PostsContainer>
          <AnimatePresence>
            {sortedPosts.map(post => (
              <Post
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <PostContent>{post.content}</PostContent>
                <PostActions>
                  <ActionButton onClick={() => handleVote(post.id, 'like')}>
                    <FaThumbsUp /> {post.likes}
                  </ActionButton>
                  <ActionButton onClick={() => handleVote(post.id, 'dislike')}>
                    <FaThumbsDown /> {post.dislikes}
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
