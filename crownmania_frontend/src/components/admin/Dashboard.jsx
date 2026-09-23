import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { adminRequest, AdminAuthError } from '../../services/adminApi';
import {
  Panel, PanelTitle, StatGrid, StatCard, StatLabel, StatValue, StatSub,
  StatusChip, TableWrap, Table, ClickableRow, LoadingRow, Spinner,
  EmptyState, ErrorBanner, RefreshButton, CopyValue,
  formatDate, formatMoney, summarizeItems, truncateMiddle,
} from './shared';
import SalesChart from './SalesChart';
import HealthCard from './HealthCard';

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
`;

const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 1.5rem;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`;

const ClaimRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.65rem 0.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-family: var(--font-secondary);
  font-size: 0.8rem;

  &:last-child { border-bottom: none; }

  .edition {
    font-family: var(--font-primary);
    color: var(--vault-accent-bright);
    font-size: 0.8rem;
    letter-spacing: 0.05em;
  }
  .wallet {
    color: rgba(255, 255, 255, 0.55);
    font-family: 'Courier New', monospace;
    font-size: 0.75rem;
  }
  .meta {
    color: rgba(255, 255, 255, 0.35);
    font-size: 0.72rem;
    text-align: right;
  }
`;

const Dashboard = ({ onAuthError, onSelectOrder }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminRequest('/api/admin/stats');
      setStats(data);
    } catch (e) {
      if (e instanceof AdminAuthError) { onAuthError(e.message); return; }
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [onAuthError]);

  useEffect(() => { load(); }, [load]);

  if (loading && !stats) {
    return <Panel><LoadingRow><Spinner /> Loading stats</LoadingRow></Panel>;
  }

  const s = stats || {};
  const byStatus = s.sales?.byStatus || {};

  return (
    <>
      {error && (
        <ErrorBanner>
          <span>{error}</span>
          <RefreshButton onClick={load} loading={loading} />
        </ErrorBanner>
      )}

      <StatGrid>
        <StatCard>
          <StatLabel>Total Revenue</StatLabel>
          <StatValue $color="#34C759">{formatMoney(s.sales?.totalRevenue)}</StatValue>
          <StatSub>{s.sales?.paidOrders ?? 0} paid orders</StatSub>
        </StatCard>
        <StatCard>
          <StatLabel>Total Orders</StatLabel>
          <StatValue>{s.sales?.totalOrders ?? '—'}</StatValue>
          <StatSub>{s.sales?.paidOrders ?? 0} paid / shipped</StatSub>
        </StatCard>
        <StatCard>
          <StatLabel>Inventory Available</StatLabel>
          <StatValue $color="var(--vault-accent-bright)">{s.inventory?.available ?? '—'}</StatValue>
          <StatSub>
            {s.inventory?.allocated ?? 0} allocated · {s.inventory?.claimed ?? 0} claimed · {s.inventory?.total ?? 0} total
          </StatSub>
        </StatCard>
        <StatCard>
          <StatLabel>Claim Codes</StatLabel>
          <StatValue>{s.overview?.claimRate ?? '—'}</StatValue>
          <StatSub>
            {s.overview?.claimedCodes ?? 0} claimed · {s.overview?.unclaimedCodes ?? 0} unclaimed · {s.overview?.totalClaimCodes ?? 0} total
          </StatSub>
        </StatCard>
        <StatCard>
          <StatLabel>NFT Transfers</StatLabel>
          <StatValue>{s.collectibles?.nftTransferred ?? '—'}</StatValue>
          <StatSub>
            {s.collectibles?.nftPending ?? 0} pending · {s.collectibles?.transferSuccessRate ?? '0%'} success
          </StatSub>
        </StatCard>
        <StatCard>
          <StatLabel>Users</StatLabel>
          <StatValue>{s.users?.total ?? '—'}</StatValue>
          <StatSub>registered accounts</StatSub>
        </StatCard>
        <StatCard>
          <StatLabel>Editions Remaining</StatLabel>
          <StatValue $color="var(--vault-accent-bright)">{s.editions?.remaining ?? '—'}</StatValue>
          <StatSub>{s.editions?.current ?? 0} / {s.editions?.total ?? 0} claimed</StatSub>
        </StatCard>
      </StatGrid>

      {Object.keys(byStatus).length > 0 && (
        <ChipRow>
          {Object.entries(byStatus).map(([status, count]) => (
            <StatusChip key={status} $status={status}>{status}: {count}</StatusChip>
          ))}
        </ChipRow>
      )}

      <SalesChart onAuthError={onAuthError} />

      <TwoCol>
        <Panel>
          <PanelTitle>
            Recent Orders
            <span className="count">last {s.sales?.recentOrders?.length ?? 0}</span>
          </PanelTitle>
          {!s.sales?.recentOrders?.length ? (
            <EmptyState>No orders yet</EmptyState>
          ) : (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {s.sales.recentOrders.map((o) => (
                    <ClickableRow key={o.id} onClick={() => onSelectOrder?.(o.id)}>
                      <td><CopyValue value={o.id} head={6} tail={4} /></td>
                      <td>{o.customerEmail || '—'}</td>
                      <td title={summarizeItems(o.items)}>{truncateMiddle(summarizeItems(o.items), 14, 8)}</td>
                      <td>{formatMoney(o.total)}</td>
                      <td><StatusChip $status={o.status}>{o.status || 'unknown'}</StatusChip></td>
                      <td>{formatDate(o.createdAt)}</td>
                    </ClickableRow>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}
        </Panel>

        <Panel>
          <PanelTitle>
            Recent Claims
            <span className="count">last {s.recentActivity?.length ?? 0}</span>
          </PanelTitle>
          {!s.recentActivity?.length ? (
            <EmptyState>No claims yet</EmptyState>
          ) : (
            s.recentActivity.map((c) => (
              <ClaimRow key={c.id}>
                <div>
                  <div className="edition">Edition {c.edition ?? '—'}</div>
                  <div className="wallet" title={c.wallet}>{c.wallet || '—'}</div>
                </div>
                <div className="meta">
                  <StatusChip $status={c.nftTransferred ? 'transferred' : 'pending_transfer'}>
                    {c.nftTransferred ? 'NFT sent' : 'pending'}
                  </StatusChip>
                  <div style={{ marginTop: '0.3rem' }}>{formatDate(c.claimedAt)}</div>
                </div>
              </ClaimRow>
            ))
          )}
        </Panel>
      </TwoCol>

      <HealthCard />

      {s.timestamp && (
        <StatSub style={{ marginTop: '1.25rem', textAlign: 'right' }}>
          Snapshot {formatDate(s.timestamp)} · <RefreshButton onClick={load} loading={loading} />
        </StatSub>
      )}
    </>
  );
};

export default Dashboard;
