import { Fragment, useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { adminRequest, AdminAuthError } from '../../services/adminApi';
import {
  Panel, PanelTitle, StatusChip, TableWrap, Table, ClickableRow, LoadingRow,
  Spinner, EmptyState, ErrorBanner, RefreshButton, SmallButton, Select, Input,
  Toolbar, CopyValue,
  formatDate, truncateMiddle,
} from './shared';

const STATUS_FILTERS = ['all', 'active', 'pending_transfer', 'failed_transfer', 'transferred', 'revoked'];

const ManageRow = styled.div`
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem 0.25rem;
  flex-wrap: wrap;
  align-items: center;
  background: rgba(65, 105, 225, 0.05);
  border-radius: 8px;
  margin: 0.25rem 0;

  ${Input} { flex: 1; min-width: 220px; }
`;

const ActionNote = styled.div`
  font-family: var(--font-secondary);
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.4);
  width: 100%;
  letter-spacing: 0.05em;
`;

const Collectibles = ({ notify, onAuthError }) => {
  const [items, setItems] = useState(null);
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [manageId, setManageId] = useState(null);
  const [wallet, setWallet] = useState('');
  const [reason, setReason] = useState('');
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ limit: '100' });
      if (status !== 'all') qs.set('status', status);
      const data = await adminRequest(`/api/admin/collectibles?${qs}`);
      setItems(data.collectibles || []);
    } catch (e) {
      if (e instanceof AdminAuthError) { onAuthError(e.message); return; }
      setError(e.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [status, onAuthError]);

  useEffect(() => { load(); }, [load]);

  const transfer = async (c) => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet.trim())) {
      notify('Enter a valid 0x wallet address', 'error');
      return;
    }
    if (!window.confirm(`Transfer collectible ${c.id} to ${wallet.trim()}?\n\nDatabase only — does not move the NFT on-chain.`)) return;
    setActing(true);
    try {
      const result = await adminRequest(`/api/admin/collectibles/${encodeURIComponent(c.id)}/transfer`, {
        method: 'POST',
        body: { newOwnerWallet: wallet.trim() },
      });
      notify(result?.message || 'Ownership transferred');
      setManageId(null);
      setWallet('');
      await load();
    } catch (e) {
      if (e instanceof AdminAuthError) { onAuthError(e.message); return; }
      notify(e.message, 'error');
    } finally {
      setActing(false);
    }
  };

  const revoke = async (c) => {
    if (!reason.trim()) {
      notify('A revocation reason is required', 'error');
      return;
    }
    if (!window.confirm(`Revoke collectible ${c.id}?\nReason: ${reason.trim()}\n\nThe claim code becomes available again.`)) return;
    setActing(true);
    try {
      const result = await adminRequest(`/api/admin/collectibles/${encodeURIComponent(c.id)}/revoke`, {
        method: 'POST',
        body: { reason: reason.trim() },
      });
      notify(result?.message || 'Collectible revoked');
      setManageId(null);
      setReason('');
      await load();
    } catch (e) {
      if (e instanceof AdminAuthError) { onAuthError(e.message); return; }
      notify(e.message, 'error');
    } finally {
      setActing(false);
    }
  };

  const list = items || [];

  return (
    <Panel>
      <PanelTitle>
        Collectibles
        <span className="count">{list.length} shown</span>
      </PanelTitle>

      <Toolbar>
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>{s === 'all' ? 'All statuses' : s.replace(/_/g, ' ')}</option>
          ))}
        </Select>
        <RefreshButton onClick={load} loading={loading} />
      </Toolbar>

      {error && (
        <ErrorBanner><span>{error}</span><RefreshButton onClick={load} loading={loading} /></ErrorBanner>
      )}

      {loading ? (
        <LoadingRow><Spinner /> Loading collectibles</LoadingRow>
      ) : !list.length ? (
        <EmptyState>No collectibles match this filter</EmptyState>
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr><th>Serial</th><th>Edition</th><th>Owner</th><th>Status</th><th>NFT</th><th>Claimed</th><th /></tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <Fragment key={c.id}>
                  <ClickableRow onClick={() => setManageId(manageId === c.id ? null : c.id)}>
                    <td title={c.serialNumber}>{truncateMiddle(c.serialNumber || c.id, 8, 4)}</td>
                    <td>{c.editionNumber ?? c.edition ?? '—'}/{c.totalEditions ?? '—'}</td>
                    <td>{c.ownerId ? <CopyValue value={c.ownerId} head={6} tail={4} /> : '—'}</td>
                    <td><StatusChip $status={c.status}>{c.status || '—'}</StatusChip></td>
                    <td>{c.tokenId ? `#${c.tokenId}` : '—'}</td>
                    <td>{formatDate(c.createdAt)}</td>
                    <td><SmallButton $variant="ghost">{manageId === c.id ? 'Close' : 'Manage'}</SmallButton></td>
                  </ClickableRow>
                  {manageId === c.id && (
                    <tr>
                      <td colSpan={7}>
                        <ManageRow>
                          <Input
                            placeholder="New owner wallet (0x…)"
                            value={wallet}
                            onChange={(e) => setWallet(e.target.value)}
                          />
                          <SmallButton onClick={() => transfer(c)} disabled={acting || !wallet.trim()}>
                            Transfer
                          </SmallButton>
                          <Input
                            placeholder="Revocation reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                          />
                          <SmallButton $variant="danger" onClick={() => revoke(c)} disabled={acting || !reason.trim()}>
                            Revoke
                          </SmallButton>
                          <ActionNote>
                            Transfer is a database correction only — it does not move the NFT on-chain.
                            Revoke marks the collectible revoked and releases its claim code.
                          </ActionNote>
                        </ManageRow>
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

export default Collectibles;
