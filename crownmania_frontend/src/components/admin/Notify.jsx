import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { adminRequest, AdminAuthError } from '../../services/adminApi';
import {
  Panel, PanelTitle, StatGrid, StatCard, StatLabel, StatValue, StatSub,
  TableWrap, Table, LoadingRow, Spinner, EmptyState, ErrorBanner,
  RefreshButton, Input, TextArea, Button,
  formatDate,
} from './shared';

const Composer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const CharCount = styled.span`
  font-family: var(--font-secondary);
  font-size: 0.68rem;
  color: rgba(255, 255, 255, 0.35);
  text-align: right;
`;

const Notify = ({ notify, onAuthError }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await adminRequest('/api/admin/push');
      setData(result);
    } catch (e) {
      if (e instanceof AdminAuthError) { onAuthError(e.message); return; }
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [onAuthError]);

  useEffect(() => { load(); }, [load]);

  const send = async () => {
    if (!title.trim() || !body.trim()) {
      notify('Title and body are required', 'error');
      return;
    }
    const tokens = data?.tokens ?? 0;
    if (!window.confirm(`Broadcast push notification to ${tokens} registered device${tokens === 1 ? '' : 's'}?\n\n"${title.trim()}"`)) return;
    setSending(true);
    try {
      const result = await adminRequest('/api/admin/push', {
        method: 'POST',
        body: { title: title.trim(), body: body.trim() },
      });
      notify(`Broadcast sent — ${result.sent}/${result.total} devices`);
      setTitle('');
      setBody('');
      await load();
    } catch (e) {
      if (e instanceof AdminAuthError) { onAuthError(e.message); return; }
      notify(e.message, 'error');
    } finally {
      setSending(false);
    }
  };

  const broadcasts = data?.broadcasts || [];

  return (
    <>
      {error && (
        <ErrorBanner><span>{error}</span><RefreshButton onClick={load} loading={loading} /></ErrorBanner>
      )}

      <StatGrid>
        <StatCard>
          <StatLabel>Registered Devices</StatLabel>
          <StatValue $color="var(--vault-accent-bright)">{data?.tokens ?? '—'}</StatValue>
          <StatSub>push tokens on file</StatSub>
        </StatCard>
      </StatGrid>

      <Panel style={{ marginBottom: '1.5rem' }}>
        <PanelTitle>Broadcast Notification</PanelTitle>
        <Composer>
          <Input
            placeholder="Title (e.g. New Drop is Live)"
            value={title}
            maxLength={80}
            onChange={(e) => setTitle(e.target.value)}
          />
          <TextArea
            placeholder="Message body — what should owners see?"
            value={body}
            maxLength={240}
            onChange={(e) => setBody(e.target.value)}
          />
          <CharCount>{body.length}/240</CharCount>
          <Button onClick={send} disabled={sending || !title.trim() || !body.trim()}>
            {sending ? 'Sending…' : 'Send Broadcast'}
          </Button>
        </Composer>
      </Panel>

      <Panel>
        <PanelTitle>
          Recent Broadcasts
          <span className="count">last {broadcasts.length}</span>
        </PanelTitle>
        {loading ? (
          <LoadingRow><Spinner /> Loading broadcasts</LoadingRow>
        ) : !broadcasts.length ? (
          <EmptyState>No broadcasts sent yet</EmptyState>
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr><th>Title</th><th>Message</th><th>Delivered</th><th>Sent By</th><th>Date</th></tr>
              </thead>
              <tbody>
                {broadcasts.map((b) => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 700 }}>{b.title}</td>
                    <td title={b.body} style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.body}</td>
                    <td>{b.sent}/{b.total}</td>
                    <td>{b.sentBy || '—'}</td>
                    <td>{formatDate(b.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Panel>
    </>
  );
};

export default Notify;
