import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { adminRequest, AdminAuthError } from '../../services/adminApi';
import {
  Panel, PanelTitle, StatusChip, TableWrap, Table,
  LoadingRow, Spinner, EmptyState, ErrorBanner, RefreshButton, CopyValue,
  formatDate, truncateMiddle,
} from './shared';

const SubTabs = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
`;

const SubTab = styled.button`
  padding: 0.5rem 1.1rem;
  border-radius: 10px;
  font-family: var(--font-secondary);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${props => props.$active ? '#fff' : 'rgba(255,255,255,0.5)'};
  background: ${props => props.$active ? 'rgba(65, 105, 225, 0.25)' : 'rgba(255,255,255,0.04)'};
  border: 1px solid ${props => props.$active ? 'rgba(107, 141, 214, 0.5)' : 'rgba(255,255,255,0.1)'};
  transition: all 0.2s ease;

  &:hover { color: #fff; border-color: var(--vault-accent); }
`;

const ClaimCodesTable = ({ rows }) => (
  <TableWrap>
    <Table>
      <thead>
        <tr>
          <th>Serial / ID</th><th>Product</th><th>Status</th><th>Claimed By</th><th>Edition</th><th>Claimed At</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((c) => (
          <tr key={c.id}>
            <td><CopyValue value={c.serialNumber || c.id} head={10} tail={6} /></td>
            <td>{c.productId || c.productName || '—'}</td>
            <td>
              <StatusChip $status={c.claimed ? 'claimed' : 'unclaimed'}>
                {c.claimed ? 'claimed' : 'unclaimed'}
              </StatusChip>
            </td>
            <td>{c.claimedBy ? <CopyValue value={c.claimedBy} head={8} tail={5} /> : '—'}</td>
            <td>{c.editionNumber ?? c.edition ?? '—'}</td>
            <td>{formatDate(c.claimedAt)}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  </TableWrap>
);

const CollectiblesTable = ({ rows }) => (
  <TableWrap>
    <Table>
      <thead>
        <tr>
          <th>Edition</th><th>Serial</th><th>Owner</th><th>Status</th><th>NFT</th><th>Created</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((c) => (
          <tr key={c.id}>
            <td>{c.editionNumber ?? c.edition ?? '—'}{c.totalEditions ? ` / ${c.totalEditions}` : ''}</td>
            <td>{c.serialNumber ? <CopyValue value={c.serialNumber} head={10} tail={5} /> : '—'}</td>
            <td>{c.ownerId ? <CopyValue value={c.ownerId} head={8} tail={6} /> : '—'}</td>
            <td><StatusChip $status={c.status}>{c.status || '—'}</StatusChip></td>
            <td>
              <StatusChip $status={c.nftTransferred ? 'transferred' : 'pending_transfer'}>
                {c.nftTransferred ? 'transferred' : 'pending'}
              </StatusChip>
            </td>
            <td>{formatDate(c.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  </TableWrap>
);

const CountChips = styled.div`
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
`;

const CountChip = styled.div`
  padding: 0.45rem 0.9rem;
  border-radius: 8px;
  font-size: 0.72rem;
  font-family: var(--font-secondary);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.75);

  strong {
    color: #fff;
    margin-right: 0.35rem;
  }
`;

const Claims = ({ notify, onAuthError }) => {
  const [view, setView] = useState('codes'); // 'codes' | 'collectibles'
  const [codes, setCodes] = useState(null);
  const [summary, setSummary] = useState(null);
  const [collectibles, setCollectibles] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadCodes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminRequest('/api/admin/claim-codes');
      setCodes(data.claimCodes || []);
      setSummary({ total: data.total, claimed: data.claimed, unclaimed: data.unclaimed });
    } catch (e) {
      if (e instanceof AdminAuthError) { onAuthError(e.message); return; }
      setError(e.message);
      setCodes([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [onAuthError]);

  const loadCollectibles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminRequest('/api/admin/collectibles?limit=100');
      setCollectibles(Array.isArray(data) ? data : (data.collectibles || data.items || []));
    } catch (e) {
      if (e instanceof AdminAuthError) { onAuthError(e.message); return; }
      setError(e.message);
      setCollectibles([]);
    } finally {
      setLoading(false);
    }
  }, [onAuthError]);

  useEffect(() => {
    if (view === 'codes' && codes === null) loadCodes();
    if (view === 'collectibles' && collectibles === null) loadCollectibles();
  }, [view, codes, collectibles, loadCodes, loadCollectibles]);

  const reload = () => (view === 'codes' ? loadCodes() : loadCollectibles());
  const rows = view === 'codes' ? codes : collectibles;

  return (
    <Panel>
      <PanelTitle>
        Claims &amp; Collectibles
        <span className="count">{rows ? `${rows.length} records` : ''}</span>
      </PanelTitle>

      <SubTabs>
        <SubTab $active={view === 'codes'} onClick={() => setView('codes')}>Claimed Codes</SubTab>
        <SubTab $active={view === 'collectibles'} onClick={() => setView('collectibles')}>Collectibles</SubTab>
        <span style={{ flex: 1 }} />
        <RefreshButton onClick={reload} loading={loading} />
      </SubTabs>

      {view === 'codes' && summary && (
        <CountChips>
          <CountChip><strong>{summary.total}</strong> total codes</CountChip>
          <CountChip><strong>{summary.claimed}</strong> claimed</CountChip>
          <CountChip><strong>{summary.unclaimed}</strong> unclaimed</CountChip>
        </CountChips>
      )}

      {error && (
        <ErrorBanner><span>{error}</span><RefreshButton onClick={reload} loading={loading} /></ErrorBanner>
      )}

      {loading && !rows ? (
        <LoadingRow><Spinner /> Loading</LoadingRow>
      ) : !rows?.length ? (
        <EmptyState>No {view === 'codes' ? 'claim codes' : 'collectibles'} found</EmptyState>
      ) : view === 'codes' ? (
        <ClaimCodesTable rows={rows} />
      ) : (
        <CollectiblesTable rows={rows} />
      )}
    </Panel>
  );
};

export default Claims;
