import { useCallback, useEffect, useState } from 'react';
import { adminRequest, AdminAuthError } from '../../services/adminApi';
import {
  Panel, PanelTitle, StatGrid, StatCard, StatLabel, StatValue, StatSub,
  StatusChip, TableWrap, Table, LoadingRow, Spinner, EmptyState, ErrorBanner,
  RefreshButton, SmallButton, Select, Toolbar, CopyValue,
  formatDate, truncateMiddle,
} from './shared';

const RETRYABLE = ['failed_transfer', 'pending_transfer'];

const Queue = ({ notify, onAuthError }) => {
  const [metrics, setMetrics] = useState(null);
  const [stuck, setStuck] = useState([]);
  const [statusFilter, setStatusFilter] = useState('failed_transfer');
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [m, list] = await Promise.all([
        adminRequest('/api/admin/queue/metrics'),
        adminRequest(`/api/admin/collectibles?status=${statusFilter}&limit=100`),
      ]);
      setMetrics(m);
      setStuck(list.collectibles || []);
    } catch (e) {
      if (e instanceof AdminAuthError) { onAuthError(e.message); return; }
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, onAuthError]);

  useEffect(() => { load(); }, [load]);

  const retry = async (id) => {
    setRetrying(id);
    try {
      const result = await adminRequest(`/api/admin/queue/retry/${encodeURIComponent(id)}`, { method: 'POST' });
      notify(result?.message || 'Retry initiated');
      await load();
    } catch (e) {
      if (e instanceof AdminAuthError) { onAuthError(e.message); return; }
      notify(e.message, 'error');
    } finally {
      setRetrying(null);
    }
  };

  const q = metrics?.queue || {};

  return (
    <>
      {error && (
        <ErrorBanner><span>{error}</span><RefreshButton onClick={load} loading={loading} /></ErrorBanner>
      )}

      <StatGrid>
        <StatCard>
          <StatLabel>Pending Transfer</StatLabel>
          <StatValue $color="#FFCC00">{q.pending ?? 0}</StatValue>
          <StatSub>awaiting mint/transfer</StatSub>
        </StatCard>
        <StatCard>
          <StatLabel>Failed</StatLabel>
          <StatValue $color="#FF3B30">{q.failed ?? 0}</StatValue>
          <StatSub>need attention</StatSub>
        </StatCard>
        <StatCard>
          <StatLabel>Completed</StatLabel>
          <StatValue $color="#34C759">{q.completed ?? 0}</StatValue>
          <StatSub>transferred on-chain</StatSub>
        </StatCard>
        <StatCard>
          <StatLabel>Dead Letter</StatLabel>
          <StatValue $color={q.deadLetter ? '#FF3B30' : '#fff'}>{q.deadLetter ?? 0}</StatValue>
          <StatSub>exhausted retries</StatSub>
        </StatCard>
      </StatGrid>

      <Panel>
        <PanelTitle>
          Transfer Queue
          <span className="count">{stuck.length} shown</span>
        </PanelTitle>

        <Toolbar>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {RETRYABLE.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </Select>
          <RefreshButton onClick={load} loading={loading} />
        </Toolbar>

        {loading ? (
          <LoadingRow><Spinner /> Loading queue</LoadingRow>
        ) : !stuck.length ? (
          <EmptyState>No collectibles in this state — queue is clean</EmptyState>
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr><th>Serial</th><th>Edition</th><th>Owner</th><th>Status</th><th>Attempts</th><th>Created</th><th /></tr>
              </thead>
              <tbody>
                {stuck.map((c) => (
                  <tr key={c.id}>
                    <td title={c.serialNumber}>{truncateMiddle(c.serialNumber || c.id, 8, 4)}</td>
                    <td>{c.editionNumber ?? c.edition ?? '—'}</td>
                    <td>{c.ownerId ? <CopyValue value={c.ownerId} head={6} tail={4} /> : '—'}</td>
                    <td><StatusChip $status={c.status}>{c.status || '—'}</StatusChip></td>
                    <td>{c.transferAttempts ?? 0}</td>
                    <td>{formatDate(c.createdAt)}</td>
                    <td>
                      <SmallButton onClick={() => retry(c.id)} disabled={retrying === c.id}>
                        {retrying === c.id ? 'Retrying…' : 'Retry'}
                      </SmallButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Panel>

      {metrics?.timestamp && (
        <StatSub style={{ marginTop: '1.25rem', textAlign: 'right' }}>
          Snapshot {formatDate(metrics.timestamp)}
        </StatSub>
      )}
    </>
  );
};

export default Queue;
