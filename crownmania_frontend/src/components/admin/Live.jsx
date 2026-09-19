import { useCallback, useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { adminRequest, AdminAuthError } from '../../services/adminApi';
import {
  Panel, PanelTitle, StatGrid, StatCard, StatLabel, StatValue, StatSub,
  TableWrap, Table, LoadingRow, Spinner, EmptyState, ErrorBanner, RefreshButton,
  formatDate, truncateMiddle,
} from './shared';

const REFRESH_MS = 20 * 1000;

const pulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.35; transform: scale(0.8); }
`;

const LiveDot = styled.span`
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #34C759;
  box-shadow: 0 0 10px rgba(52, 199, 89, 0.8);
  animation: ${pulse} 1.6s ease-in-out infinite;
  margin-right: 0.5rem;
`;

const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 1.5rem;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`;

const DayRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-family: var(--font-secondary);
  font-size: 0.8rem;
  padding: 0.5rem 0.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.75);

  &:last-child { border-bottom: none; }
  .date { color: rgba(255, 255, 255, 0.4); }
  .views { color: var(--vault-accent-bright); font-weight: 700; }
  .uniques { color: rgba(255, 255, 255, 0.55); }
`;

const sourceLabel = (referrer) => {
  if (!referrer) return 'Direct';
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '');
    return host || 'Direct';
  } catch {
    return 'Direct';
  }
};

const deviceLabel = (ua) => {
  if (!ua) return '—';
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Macintosh|Mac OS/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Other';
};

const Live = ({ onAuthError }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const timerRef = useRef(null);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const result = await adminRequest('/api/admin/analytics');
      setData(result);
      setError('');
    } catch (e) {
      if (e instanceof AdminAuthError) { onAuthError(e.message); return; }
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [onAuthError]);

  useEffect(() => {
    load(true);
    timerRef.current = setInterval(() => load(false), REFRESH_MS);
    return () => clearInterval(timerRef.current);
  }, [load]);

  if (loading && !data) {
    return <Panel><LoadingRow><Spinner /> Loading live traffic</LoadingRow></Panel>;
  }

  const d = data || {};
  const liveSessions = d.live?.sessions || [];

  return (
    <>
      {error && (
        <ErrorBanner>
          <span>{error}</span>
          <RefreshButton onClick={() => load(true)} loading={loading} />
        </ErrorBanner>
      )}

      <StatGrid>
        <StatCard>
          <StatLabel><LiveDot />Online Now</StatLabel>
          <StatValue $color="#34C759">{d.live?.count ?? 0}</StatValue>
          <StatSub>active in last {d.live?.windowMinutes ?? 3} min</StatSub>
        </StatCard>
        <StatCard>
          <StatLabel>Today's Visitors</StatLabel>
          <StatValue>{d.today?.uniques ?? 0}</StatValue>
          <StatSub>unique sessions</StatSub>
        </StatCard>
        <StatCard>
          <StatLabel>Today's Pageviews</StatLabel>
          <StatValue $color="var(--vault-accent-bright)">{d.today?.pageviews ?? 0}</StatValue>
          <StatSub>across all pages</StatSub>
        </StatCard>
      </StatGrid>

      <TwoCol>
        <div>
          <Panel style={{ marginBottom: '1.5rem' }}>
            <PanelTitle>
              Online Now
              <span className="count">{liveSessions.length}</span>
            </PanelTitle>
            {!liveSessions.length ? (
              <EmptyState>No visitors currently online</EmptyState>
            ) : (
              <TableWrap>
                <Table>
                  <thead>
                    <tr><th>Page</th><th>Source</th><th>Device</th><th>Views</th></tr>
                  </thead>
                  <tbody>
                    {liveSessions.map((s) => (
                      <tr key={s.id}>
                        <td title={s.lastPath}>{truncateMiddle(s.lastPath || '/', 10, 8)}</td>
                        <td>{sourceLabel(s.referrer)}</td>
                        <td>{deviceLabel(s.ua)}</td>
                        <td>{s.pageviews}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            )}
          </Panel>

          <Panel>
            <PanelTitle>Last 7 Days</PanelTitle>
            {!d.last7Days?.length ? (
              <EmptyState>No traffic recorded yet</EmptyState>
            ) : (
              d.last7Days.map((day) => (
                <DayRow key={day.date}>
                  <span className="date">{day.date}</span>
                  <span>
                    <span className="views">{day.pageviews}</span>{' '}
                    <span className="uniques">({day.uniques} visitors)</span>
                  </span>
                </DayRow>
              ))
            )}
          </Panel>
        </div>

        <Panel>
          <PanelTitle>
            Recent Sessions
            <span className="count">last {d.recentSessions?.length ?? 0}</span>
          </PanelTitle>
          {!d.recentSessions?.length ? (
            <EmptyState>No sessions yet — visits appear here in real time</EmptyState>
          ) : (
            <TableWrap>
              <Table>
                <thead>
                  <tr><th>Last Seen</th><th>Page</th><th>Source</th><th>Device</th><th>Views</th></tr>
                </thead>
                <tbody>
                  {d.recentSessions.map((s) => (
                    <tr key={s.id}>
                      <td>{formatDate(s.lastSeen)}</td>
                      <td title={s.lastPath}>{truncateMiddle(s.lastPath || '/', 10, 8)}</td>
                      <td>{sourceLabel(s.referrer)}</td>
                      <td>{deviceLabel(s.ua)}</td>
                      <td>{s.pageviews}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}
        </Panel>
      </TwoCol>

      {d.topPages?.length > 0 && (
        <Panel style={{ marginTop: '1.5rem' }}>
          <PanelTitle>Top Pages (7 days)</PanelTitle>
          <TableWrap>
            <Table>
              <thead>
                <tr><th>Page</th><th style={{ textAlign: 'right' }}>Views</th></tr>
              </thead>
              <tbody>
                {d.topPages.map((p) => (
                  <tr key={p.path}>
                    <td>{p.path}</td>
                    <td style={{ textAlign: 'right' }}>{p.views}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        </Panel>
      )}

      <StatSub style={{ marginTop: '1.25rem', textAlign: 'right' }}>
        Auto-refreshes every {REFRESH_MS / 1000}s · {d.generatedAt ? `snapshot ${formatDate(d.generatedAt)}` : ''}
      </StatSub>
    </>
  );
};

export default Live;
