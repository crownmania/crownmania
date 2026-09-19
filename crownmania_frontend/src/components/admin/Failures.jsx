import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { FaRedo } from 'react-icons/fa';
import { adminRequest, AdminAuthError } from '../../services/adminApi';
import {
  Panel, PanelTitle, StatusChip, TableWrap, Table,
  LoadingRow, Spinner, EmptyState, ErrorBanner, RefreshButton, CopyValue,
  SmallButton, Select,
  formatDate, formatCents, truncateMiddle,
} from './shared';

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`;

const ErrorText = styled.div`
  font-family: var(--font-secondary);
  font-size: 0.75rem;
  color: rgba(255, 138, 128, 0.9);
  max-width: 340px;
`;

const FAIL_STATUSES = ['pending', 'retried', 'resolved'];

const Failures = ({ notify, onAuthError }) => {
  const [failures, setFailures] = useState(null);
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState(null);

  const load = useCallback(async (s = status) => {
    setLoading(true);
    setError('');
    try {
      const data = await adminRequest(`/api/admin/fulfillment-failures?status=${encodeURIComponent(s)}`);
      setFailures(data.failures || data.items || []);
    } catch (e) {
      if (e instanceof AdminAuthError) { onAuthError(e.message); return; }
      setError(e.message);
      setFailures([]);
    } finally {
      setLoading(false);
    }
  }, [status, onAuthError]);

  useEffect(() => { load(status); }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const retry = async (sessionId) => {
    if (!window.confirm(`Retry fulfillment for session ${sessionId}?`)) return;
    setRetrying(sessionId);
    try {
      const result = await adminRequest(
        `/api/admin/fulfillment-failures/${encodeURIComponent(sessionId)}/retry`,
        { method: 'POST' }
      );
      notify(result?.message || 'Fulfillment retried successfully');
      await load();
    } catch (e) {
      if (e instanceof AdminAuthError) { onAuthError(e.message); return; }
      notify(e.message, 'error');
    } finally {
      setRetrying(null);
    }
  };

  const list = failures || [];

  return (
    <Panel>
      <PanelTitle>
        Fulfillment Failures
        <span className="count">{list.length} {status}</span>
      </PanelTitle>

      <Toolbar>
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          {FAIL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <RefreshButton onClick={() => load()} loading={loading} />
      </Toolbar>

      {error && (
        <ErrorBanner><span>{error}</span><RefreshButton onClick={() => load()} loading={loading} /></ErrorBanner>
      )}

      {loading && !failures ? (
        <LoadingRow><Spinner /> Loading failures</LoadingRow>
      ) : !list.length ? (
        <EmptyState>No {status} fulfillment failures</EmptyState>
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <th>Session</th><th>Customer</th><th>Amount</th><th>Error</th><th>Status</th><th>Recorded</th><th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((f) => {
                const sid = f.sessionId || f.id;
                return (
                  <tr key={f.id || sid}>
                    <td><CopyValue value={sid} head={10} tail={6} /></td>
                    <td>{f.customerEmail || '—'}</td>
                    <td>{f.amountTotal != null ? formatCents(f.amountTotal) : '—'}</td>
                    <td><ErrorText title={f.error}>{truncateMiddle(f.error || '—', 30, 15)}</ErrorText></td>
                    <td><StatusChip $status={f.status}>{f.status || '—'}</StatusChip></td>
                    <td>{formatDate(f.createdAt)}</td>
                    <td>
                      {f.status === 'pending' && (
                        <SmallButton onClick={() => retry(sid)} disabled={retrying === sid}>
                          <FaRedo /> {retrying === sid ? 'Retrying…' : 'Retry'}
                        </SmallButton>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </Panel>
  );
};

export default Failures;
