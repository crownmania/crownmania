import { useCallback, useEffect, useState } from 'react';
import { adminRequest, AdminAuthError } from '../../services/adminApi';
import {
  Panel, PanelTitle, TableWrap, Table, LoadingRow, Spinner, EmptyState,
  ErrorBanner, RefreshButton, Select, RangePicker, rangeFromTo, Toolbar,
  formatDate, truncateMiddle,
} from './shared';

const KNOWN_EVENTS = [
  'all',
  'nft_claim_success',
  'nft_transfer_failed',
  'nft_transfer_detected',
  'transfer_retry_initiated',
  'content_created',
  'content_upload_success',
  'content_upload_failed',
  'content_access_granted',
  'content_access_denied',
  'content_drop_notifications_sent',
  'push_broadcast',
  'forum_post_deleted',
  'forum_reply_deleted',
  'SHIP_NOTIFY',
  'ownership_mismatch_reconciled',
  'ownership_reconciliation_completed',
];

// Fields rendered as columns; everything else is packed into Details.
const ACTOR_KEYS = ['adminEmail', 'adminId', 'userId', 'walletAddress', 'username', 'email'];
const SKIP_KEYS = new Set(['id', 'timestamp', 'event', 'source', ...ACTOR_KEYS]);

const actorOf = (log) => {
  for (const k of ACTOR_KEYS) {
    if (log[k]) return log[k];
  }
  return log.ip || '—';
};

const detailsOf = (log) => {
  const rest = Object.fromEntries(
    Object.entries(log).filter(([k]) => !SKIP_KEYS.has(k) && log[k] != null)
  );
  const s = JSON.stringify(rest);
  return s === '{}' ? '—' : s;
};

const Activity = ({ onAuthError }) => {
  const [logs, setLogs] = useState(null);
  const [event, setEvent] = useState('all');
  const [range, setRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ limit: '100' });
      if (event !== 'all') qs.set('event', event);
      const { from, to } = rangeFromTo(range);
      if (from) qs.set('from', from);
      if (to) qs.set('to', to);
      const data = await adminRequest(`/api/admin/audit-logs?${qs}`);
      setLogs(data.logs || []);
    } catch (e) {
      if (e instanceof AdminAuthError) { onAuthError(e.message); return; }
      setError(e.message);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [event, range, onAuthError]);

  useEffect(() => { load(); }, [load]);

  const list = logs || [];

  return (
    <Panel>
      <PanelTitle>
        Activity Log
        <span className="count">{list.length} events</span>
      </PanelTitle>

      <Toolbar>
        <Select value={event} onChange={(e) => setEvent(e.target.value)}>
          {KNOWN_EVENTS.map((ev) => (
            <option key={ev} value={ev}>{ev === 'all' ? 'All events' : ev}</option>
          ))}
        </Select>
        <RangePicker value={range} onChange={setRange} />
        <RefreshButton onClick={load} loading={loading} />
      </Toolbar>

      {error && (
        <ErrorBanner><span>{error}</span><RefreshButton onClick={load} loading={loading} /></ErrorBanner>
      )}

      {loading ? (
        <LoadingRow><Spinner /> Loading activity</LoadingRow>
      ) : !list.length ? (
        <EmptyState>No events in this range</EmptyState>
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr><th>Time</th><th>Event</th><th>Actor</th><th>Details</th></tr>
            </thead>
            <tbody>
              {list.map((log) => (
                <tr key={log.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(log.timestamp)}</td>
                  <td><code style={{ fontSize: '0.75rem', color: 'var(--vault-accent-bright)' }}>{log.event || '—'}</code></td>
                  <td title={actorOf(log)}>{truncateMiddle(String(actorOf(log)), 14, 8)}</td>
                  <td title={detailsOf(log)} style={{ maxWidth: '340px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {truncateMiddle(detailsOf(log), 40, 12)}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </Panel>
  );
};

export default Activity;
