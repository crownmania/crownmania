import { Fragment, useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { adminRequest, AdminAuthError } from '../../services/adminApi';
import {
  Panel, PanelTitle, TableWrap, Table, ClickableRow, LoadingRow, Spinner,
  EmptyState, ErrorBanner, RefreshButton, SmallButton, Toolbar,
  formatDate, truncateMiddle,
} from './shared';

const Replies = styled.div`
  padding: 0.5rem 0.25rem 0.75rem;
`;

const ReplyRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-family: var(--font-secondary);
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.75);
  padding: 0.45rem 0.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  &:last-child { border-bottom: none; }
  .content { flex: 1; }
  .meta { color: rgba(255, 255, 255, 0.35); font-size: 0.7rem; white-space: nowrap; }
`;

const ForumMod = ({ notify, onAuthError }) => {
  const [posts, setPosts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);
  const [replies, setReplies] = useState({});
  const [repliesLoading, setRepliesLoading] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminRequest('/api/admin/forum/posts');
      setPosts(data.posts || []);
    } catch (e) {
      if (e instanceof AdminAuthError) { onAuthError(e.message); return; }
      setError(e.message);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [onAuthError]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (postId) => {
    if (openId === postId) { setOpenId(null); return; }
    setOpenId(postId);
    if (replies[postId]) return;
    setRepliesLoading(postId);
    try {
      // Public read endpoint — no auth needed
      const data = await adminRequest(`/api/forum/posts/${encodeURIComponent(postId)}/replies`, { auth: false });
      setReplies(r => ({ ...r, [postId]: data.replies || [] }));
    } catch (e) {
      if (e instanceof AdminAuthError) { onAuthError(e.message); return; }
      notify(e.message, 'error');
    } finally {
      setRepliesLoading(null);
    }
  };

  const deletePost = async (post) => {
    if (!window.confirm(`Delete this post and all its replies?\n\n"${(post.content || '').slice(0, 80)}"`)) return;
    setDeleting(post.id);
    try {
      await adminRequest(`/api/admin/forum/posts/${encodeURIComponent(post.id)}`, { method: 'DELETE' });
      notify('Post deleted');
      setOpenId(null);
      await load();
    } catch (e) {
      if (e instanceof AdminAuthError) { onAuthError(e.message); return; }
      notify(e.message, 'error');
    } finally {
      setDeleting(null);
    }
  };

  const deleteReply = async (postId, reply) => {
    if (!window.confirm(`Delete this reply?\n\n"${(reply.content || '').slice(0, 80)}"`)) return;
    setDeleting(reply.id);
    try {
      await adminRequest(`/api/admin/forum/posts/${encodeURIComponent(postId)}/replies/${encodeURIComponent(reply.id)}`, { method: 'DELETE' });
      notify('Reply deleted');
      setReplies(r => ({ ...r, [postId]: (r[postId] || []).filter(x => x.id !== reply.id) }));
      await load();
    } catch (e) {
      if (e instanceof AdminAuthError) { onAuthError(e.message); return; }
      notify(e.message, 'error');
    } finally {
      setDeleting(null);
    }
  };

  const list = posts || [];

  return (
    <Panel>
      <PanelTitle>
        Forum Moderation
        <span className="count">{list.length} posts</span>
      </PanelTitle>

      <Toolbar>
        <RefreshButton onClick={load} loading={loading} />
      </Toolbar>

      {error && (
        <ErrorBanner><span>{error}</span><RefreshButton onClick={load} loading={loading} /></ErrorBanner>
      )}

      {loading ? (
        <LoadingRow><Spinner /> Loading posts</LoadingRow>
      ) : !list.length ? (
        <EmptyState>No forum posts yet</EmptyState>
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr><th>Post</th><th>Author</th><th>+/-</th><th>Replies</th><th>Posted</th><th /></tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <Fragment key={p.id}>
                  <ClickableRow onClick={() => toggle(p.id)}>
                    <td title={p.content} style={{ maxWidth: '360px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {truncateMiddle(p.content || '', 50, 10)}
                    </td>
                    <td>{p.authorName || 'Anonymous'}</td>
                    <td>{p.likes}/{p.dislikes}</td>
                    <td>{p.replyCount}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(p.createdAt)}</td>
                    <td>
                      <SmallButton $variant="danger" onClick={(e) => { e.stopPropagation(); deletePost(p); }} disabled={deleting === p.id}>
                        {deleting === p.id ? 'Deleting…' : 'Delete'}
                      </SmallButton>
                    </td>
                  </ClickableRow>
                  {openId === p.id && (
                    <tr>
                      <td colSpan={6}>
                        <Replies>
                          {repliesLoading === p.id ? (
                            <LoadingRow style={{ padding: '1rem' }}><Spinner $size="18px" /> Loading replies</LoadingRow>
                          ) : !(replies[p.id] || []).length ? (
                            <EmptyState style={{ padding: '1rem' }}>No replies</EmptyState>
                          ) : (
                            replies[p.id].map((r) => (
                              <ReplyRow key={r.id}>
                                <span className="content" title={r.content}>{r.content}</span>
                                <span className="meta">{r.authorName} · {formatDate(r.createdAt)}</span>
                                <SmallButton $variant="danger" onClick={() => deleteReply(p.id, r)} disabled={deleting === r.id}>
                                  Delete
                                </SmallButton>
                              </ReplyRow>
                            ))
                          )}
                        </Replies>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </Panel>
  );
};

export default ForumMod;
