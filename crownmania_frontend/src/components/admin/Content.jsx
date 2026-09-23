import { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { adminRequest, adminUpload, AdminAuthError } from '../../services/adminApi';
import {
  Panel, PanelTitle, StatusChip, TableWrap, Table, LoadingRow, Spinner,
  EmptyState, ErrorBanner, RefreshButton, SmallButton, Select, Input, Button,
  Toolbar,
  formatDate, truncateMiddle,
} from './shared';

const CONTENT_TYPES = ['video', 'audio', 'image', 'document', 'other'];
const ACCESS_LEVELS = ['token_gated', 'public'];

const UploadForm = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.25rem;

  .full { grid-column: 1 / -1; }
`;

const FileInput = styled.input`
  font-family: var(--font-secondary);
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);

  &::file-selector-button {
    padding: 0.5rem 1rem;
    margin-right: 0.75rem;
    border-radius: 8px;
    border: 1px solid rgba(107, 141, 214, 0.4);
    background: rgba(65, 105, 225, 0.2);
    color: #fff;
    font-family: var(--font-secondary);
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
  }
`;

const formatSize = (bytes) => {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return '—';
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

const Content = ({ notify, onAuthError }) => {
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const fileRef = useRef(null);
  const [form, setForm] = useState({
    productId: 'lil-durk-figure',
    tokenId: '',
    contentType: 'video',
    accessLevel: 'token_gated',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminRequest('/api/admin/content');
      setItems(data.content || []);
    } catch (e) {
      if (e instanceof AdminAuthError) { onAuthError(e.message); return; }
      setError(e.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [onAuthError]);

  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const upload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) { notify('Choose a file first', 'error'); return; }
    if (!form.productId.trim() || !form.tokenId.trim()) {
      notify('Product ID and Token ID are required', 'error');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('productId', form.productId.trim());
      fd.append('tokenId', form.tokenId.trim());
      fd.append('contentType', form.contentType);
      fd.append('accessLevel', form.accessLevel);
      const result = await adminUpload('/api/content/upload', fd);
      notify(result?.message || 'Content uploaded');
      if (fileRef.current) fileRef.current.value = '';
      setForm(f => ({ ...f, tokenId: '' }));
      await load();
    } catch (e) {
      if (e instanceof AdminAuthError) { onAuthError(e.message); return; }
      notify(e.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const remove = async (item) => {
    const id = item.contentId || item.id;
    if (!window.confirm(`Delete "${item.originalName || item.title || id}"?\n\nThis removes the file from storage and Firestore.`)) return;
    setDeleting(id);
    try {
      await adminRequest(`/api/content/${encodeURIComponent(id)}`, { method: 'DELETE' });
      notify('Content deleted');
      await load();
    } catch (e) {
      if (e instanceof AdminAuthError) { onAuthError(e.message); return; }
      notify(e.message, 'error');
    } finally {
      setDeleting(null);
    }
  };

  const list = items || [];

  return (
    <>
      <Panel style={{ marginBottom: '1.5rem' }}>
        <PanelTitle>Upload Vault Content</PanelTitle>
        <UploadForm>
          <div className="full">
            <FileInput ref={fileRef} type="file" />
          </div>
          <Input placeholder="Product ID" value={form.productId} onChange={set('productId')} />
          <Input placeholder="Token ID (collectible doc ID)" value={form.tokenId} onChange={set('tokenId')} />
          <Select value={form.contentType} onChange={set('contentType')}>
            {CONTENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Select value={form.accessLevel} onChange={set('accessLevel')}>
            {ACCESS_LEVELS.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </Select>
          <Button onClick={upload} disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload'}
          </Button>
        </UploadForm>
      </Panel>

      <Panel>
        <PanelTitle>
          Content
          <span className="count">{list.length} items</span>
        </PanelTitle>

        <Toolbar>
          <RefreshButton onClick={load} loading={loading} />
        </Toolbar>

        {error && (
          <ErrorBanner><span>{error}</span><RefreshButton onClick={load} loading={loading} /></ErrorBanner>
        )}

        {loading ? (
          <LoadingRow><Spinner /> Loading content</LoadingRow>
        ) : !list.length ? (
          <EmptyState>No content uploaded yet</EmptyState>
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr><th>Name</th><th>Type</th><th>Product</th><th>Access</th><th>Size</th><th>Status</th><th>Added</th><th /></tr>
              </thead>
              <tbody>
                {list.map((item) => {
                  const id = item.contentId || item.id;
                  return (
                    <tr key={id}>
                      <td title={item.originalName || item.title}>
                        {truncateMiddle(item.metadata?.title || item.originalName || item.title || id, 16, 8)}
                      </td>
                      <td>{item.metadata?.contentType || item.contentType || item.type || '—'}</td>
                      <td>{item.metadata?.productId || item.productId || '—'}</td>
                      <td>{(item.metadata?.accessLevel || '—').replace(/_/g, ' ')}</td>
                      <td>{formatSize(item.size)}</td>
                      <td><StatusChip $status={item.status}>{item.status || '—'}</StatusChip></td>
                      <td>{formatDate(item.createdAt)}</td>
                      <td>
                        {item.storagePath ? (
                          <SmallButton $variant="danger" onClick={() => remove(item)} disabled={deleting === id}>
                            {deleting === id ? 'Deleting…' : 'Delete'}
                          </SmallButton>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Panel>
    </>
  );
};

export default Content;
