import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { adminRequest } from '../../services/adminApi';
import { Panel, PanelTitle, LoadingRow, Spinner, RefreshButton, StatusChip, formatDate } from './shared';

const HealthGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
`;

const HealthItem = styled.div`
  .label {
    font-family: var(--font-secondary);
    font-size: 0.62rem;
    color: rgba(255, 255, 255, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.15em;
    font-weight: 600;
    margin-bottom: 0.35rem;
  }
  .value {
    font-family: var(--font-secondary);
    font-size: 0.9rem;
    color: #fff;
  }
`;

const HealthCard = () => {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Public endpoint — never fails auth, degrade silently on network error
      const data = await adminRequest('/health', { auth: false });
      setHealth(data);
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <Panel style={{ marginTop: '1.5rem' }}>
      <PanelTitle>
        System Health
        <RefreshButton onClick={load} loading={loading} />
      </PanelTitle>
      {loading && !health ? (
        <LoadingRow style={{ padding: '1rem' }}><Spinner $size="18px" /> Checking</LoadingRow>
      ) : !health ? (
        <HealthItem><div className="value" style={{ color: '#FF8A80' }}>Backend unreachable</div></HealthItem>
      ) : (
        <HealthGrid>
          <HealthItem>
            <div className="label">Status</div>
            <div className="value">
              <StatusChip $status={health.status === 'ok' ? 'active' : 'failed'}>{health.status}</StatusChip>
            </div>
          </HealthItem>
          <HealthItem>
            <div className="label">Uptime</div>
            <div className="value">{health.uptime || '—'}</div>
          </HealthItem>
          <HealthItem>
            <div className="label">Firestore</div>
            <div className="value">
              <StatusChip $status={health.firebase === 'connected' ? 'active' : 'failed'}>
                {health.firebase || '—'}
              </StatusChip>
            </div>
          </HealthItem>
          <HealthItem>
            <div className="label">Environment</div>
            <div className="value">{health.environment || '—'}</div>
          </HealthItem>
          <HealthItem>
            <div className="label">Checked</div>
            <div className="value">{formatDate(health.timestamp)}</div>
          </HealthItem>
        </HealthGrid>
      )}
    </Panel>
  );
};

export default HealthCard;
