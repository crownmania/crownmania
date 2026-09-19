import { useCallback, useEffect, useState } from 'react';
import { FaCheck } from 'react-icons/fa';
import { adminRequest, AdminAuthError } from '../../services/adminApi';
import {
  Panel, PanelTitle, StatusChip, TableWrap, Table,
  LoadingRow, Spinner, EmptyState, ErrorBanner, RefreshButton, CopyValue,
  formatDate, truncateMiddle,
} from './shared';

const Users = ({ notify, onAuthError }) => {
  const [users, setUsers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminRequest('/api/admin/users?limit=100');
      setUsers(Array.isArray(data) ? data : (data.users || data.items || []));
    } catch (e) {
      if (e instanceof AdminAuthError) { onAuthError(e.message); return; }
      setError(e.message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [onAuthError]);

  useEffect(() => { load(); }, [load]);

  return (
    <Panel>
      <PanelTitle>
        Users
        <span className="count">{users ? `${users.length} shown` : ''}</span>
      </PanelTitle>

      <div style={{ marginBottom: '1rem' }}>
        <RefreshButton onClick={load} loading={loading} />
      </div>

      {error && (
        <ErrorBanner><span>{error}</span><RefreshButton onClick={load} loading={loading} /></ErrorBanner>
      )}

      {loading && !users ? (
        <LoadingRow><Spinner /> Loading users</LoadingRow>
      ) : !users?.length ? (
        <EmptyState>No users found</EmptyState>
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <th>Wallet</th><th>Name</th><th>Email</th><th>Role</th><th>Profile</th><th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const wallet = u.walletAddress || u.wallet || u.address;
                const email = u.email || u.emailPlain;
                return (
                  <tr key={u.id || wallet}>
                    <td>{wallet ? <CopyValue value={wallet} head={8} tail={6} /> : <CopyValue value={u.id} head={8} tail={4} />}</td>
                    <td>{u.name || '—'}</td>
                    <td>{email ? <span title={email}>{truncateMiddle(email, 12, 10)}</span> : '—'}</td>
                    <td><StatusChip $status={u.role || 'user'}>{u.role || 'user'}</StatusChip></td>
                    <td>{u.profileComplete ? <FaCheck style={{ color: '#34C759' }} /> : '—'}</td>
                    <td>{formatDate(u.createdAt)}</td>
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

export default Users;
