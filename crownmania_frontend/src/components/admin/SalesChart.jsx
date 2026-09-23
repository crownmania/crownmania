import { useCallback, useEffect, useState } from 'react';
import { adminRequest, AdminAuthError } from '../../services/adminApi';
import {
  Panel, PanelTitle, LoadingRow, Spinner, EmptyState, ErrorBanner,
  RefreshButton, RangePicker, Toolbar, BarChart, StatusChip,
  formatMoney,
} from './shared';

const shortLabel = (key, granularity) =>
  granularity === 'month' ? key : key.slice(5); // YYYY-MM vs MM-DD

const SalesChart = ({ onAuthError }) => {
  const [data, setData] = useState(null);
  const [range, setRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await adminRequest(`/api/admin/sales?range=${range}`);
      setData(result);
    } catch (e) {
      if (e instanceof AdminAuthError) { onAuthError(e.message); return; }
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [range, onAuthError]);

  useEffect(() => { load(); }, [load]);

  const buckets = (data?.buckets || []).map(b => ({
    key: b.key,
    label: shortLabel(b.key, data?.granularity),
    value: Math.round(b.revenue),
    title: `${b.key}: ${formatMoney(b.revenue)} · ${b.orders} order${b.orders === 1 ? '' : 's'}`,
  }));

  const byStatus = data?.byStatus || {};

  return (
    <Panel style={{ marginBottom: '1.5rem' }}>
      <PanelTitle>
        Sales
        <span className="count">
          {data ? `${formatMoney(data.totals?.revenue)} · ${data.totals?.orders ?? 0} orders` : ''}
        </span>
      </PanelTitle>

      <Toolbar>
        <RangePicker value={range} onChange={setRange} />
        <RefreshButton onClick={load} loading={loading} />
        {Object.keys(byStatus).length > 0 && (
          <span style={{ display: 'inline-flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {Object.entries(byStatus).map(([s, n]) => (
              <StatusChip key={s} $status={s}>{s}: {n}</StatusChip>
            ))}
          </span>
        )}
      </Toolbar>

      {error && (
        <ErrorBanner><span>{error}</span><RefreshButton onClick={load} loading={loading} /></ErrorBanner>
      )}

      {loading ? (
        <LoadingRow><Spinner /> Loading sales</LoadingRow>
      ) : !buckets.length ? (
        <EmptyState>No sales in this range</EmptyState>
      ) : (
        <BarChart data={buckets} height="140px" />
      )}
    </Panel>
  );
};

export default SalesChart;
