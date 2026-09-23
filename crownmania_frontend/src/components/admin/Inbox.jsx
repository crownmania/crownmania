import { Fragment, useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { adminRequest, AdminAuthError } from '../../services/adminApi';
import {
  Panel, PanelTitle, TableWrap, Table, ClickableRow, LoadingRow, Spinner,
  EmptyState, ErrorBanner, RefreshButton, SmallButton, Select, RangePicker,
  rangeFromTo, Toolbar, UnreadDot,
  formatDate, truncateMiddle,
} from './shared';

const MessageBody = styled.div`
  font-family: var(--font-secondary);
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.7;
  white-space: pre-wrap;
  padding: 0.75rem 0.25rem;
`;

const Inbox = ({ notify, onAuthError }) => {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('unread');
  const [range, setRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);
  const [marking, setMarking] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ status, limit: '100' });
      const { from, to } = rangeFromTo(range);
      if (from) qs.set('from', from);
      if (to) qs.set('to', to);
      const result = await adminRequest(`/api/admin/contact-messages?${qs}`);
      setData(result);
    } catch (e) {
      if (e instanceof AdminAuthError) { onAuthError(e.message); return; }
      setError(e.message);
      setData({ messages: [] });
    } finally {
      setLoading(false);
    }
  }, [status, range, onAuthError]);

  useEffect(() => { load(); }, [load]);

  const markRead = async (m, read) => {
    setMarking(m.id);
    try {
      await adminRequest(`/api/admin/contact-messages/${encodeURIComponent(m.id)}/read`, {
        method: 'POST',
        body: { read },
      });
      await load();
    } catch (e) {
      if (e instanceof AdminAuthError) { onAuthError(e.message); return; }
      notify(e.message, 'error');
    } finally {
      setMarking(null);
    }
  };

  const list = data?.messages || [];

  return (
    <Panel>
      <PanelTitle>
        Contact Inbox
        <span className="count">{data?.unread ?? 0} unread</span>
      </PanelTitle>

      <Toolbar>
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
          <option value="all">All</option>
        </Select>
        <RangePicker value={range} onChange={setRange} />
        <RefreshButton onClick={load} loading={loading} />
      </Toolbar>

      {error && (
        <ErrorBanner><span>{error}</span><RefreshButton onClick={load} loading={loading} /></ErrorBanner>
      )}

      {loading ? (
        <LoadingRow><Spinner /> Loading messages</LoadingRow>
      ) : !list.length ? (
        <EmptyState>No messages in this filter</EmptyState>
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr><th /><th>From</th><th>Message</th><th>Received</th><th /></tr>
            </thead>
            <tbody>
              {list.map((m) => (
                <Fragment key={m.id}>
                  <ClickableRow onClick={() => setOpenId(openId === m.id ? null : m.id)}>
                    <td style={{ width: '20px' }}>{!m.read && <UnreadDot />}</td>
                    <td>
                      <div style={{ fontWeight: m.read ? 400 : 700 }}>{m.name || '—'}</div>
                      <a
                        href={`mailto:${m.email}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{ color: 'var(--vault-accent-bright)', fontSize: '0.75rem', textDecoration: 'none' }}
                      >
                        {m.email}
                      </a>
                    </td>
                    <td title={m.message}>{truncateMiddle(m.message || '', 40, 12)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(m.createdAt)}</td>
                    <td>
                      <SmallButton $variant="ghost" onClick={(e) => { e.stopPropagation(); markRead(m, !m.read); }} disabled={marking === m.id}>
                        {m.read ? 'Mark unread' : 'Mark read'}
                      </SmallButton>
                    </td>
                  </ClickableRow>
                  {openId === m.id && (
                    <tr>
                      <td colSpan={5}>
                        <MessageBody>{m.message}</MessageBody>
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

export default Inbox;
