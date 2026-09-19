import { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { FaCheck, FaCopy, FaSyncAlt } from 'react-icons/fa';

// ============================================
// HELPERS
// ============================================

/**
 * Normalize Firestore timestamps ({seconds}/{_seconds} objects, .toDate()),
 * ISO strings, epoch millis/seconds, and Dates into a Date (or null).
 */
export const toDate = (value) => {
  if (value == null) return null;
  if (value instanceof Date) return isNaN(value) ? null : value;
  if (typeof value === 'number') {
    // Heuristic: seconds vs millis
    const ms = value > 1e12 ? value : value * 1000;
    const d = new Date(ms);
    return isNaN(d) ? null : d;
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d) ? null : d;
  }
  if (typeof value === 'object') {
    if (typeof value.toDate === 'function') {
      try { return toDate(value.toDate()); } catch { return null; }
    }
    const secs = value.seconds ?? value._seconds;
    if (typeof secs === 'number') return new Date(secs * 1000);
  }
  return null;
};

export const formatDate = (value) => {
  const d = toDate(value);
  if (!d) return '—';
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

/** Order totals are plain dollar numbers (e.g. 200) -> "$200.00" */
export const formatMoney = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return '—';
  return `$${num.toFixed(2)}`;
};

/** Failure records carry Stripe amountTotal in cents */
export const formatCents = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return '—';
  return `$${(num / 100).toFixed(2)}`;
};

export const truncateMiddle = (value, head = 8, tail = 6) => {
  const s = String(value);
  if (s.length <= head + tail + 1) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
};

/** Render an items array ([{quantity,name}...] or string[]) as a summary */
export const summarizeItems = (items) => {
  if (!items) return '—';
  if (typeof items === 'string') return items;
  if (Array.isArray(items)) {
    const parts = items.map((i) => {
      if (typeof i === 'string') return i;
      const qty = i?.quantity ?? i?.qty ?? 1;
      const name = i?.name ?? i?.productName ?? i?.productId ?? 'item';
      return `${qty}x ${name}`;
    });
    return parts.join(', ') || '—';
  }
  return '—';
};

// ============================================
// STYLED COMPONENTS
// ============================================

export const spin = keyframes`
  to { transform: rotate(360deg); }
`;

export const Panel = styled.div`
  background: var(--bg-vault);
  backdrop-filter: var(--glass-blur);
  border: var(--glass-border);
  border-radius: 16px;
  padding: 1.5rem;
  position: relative;
  box-shadow: var(--vault-shadow);
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    pointer-events: none;
  }
`;

export const PanelTitle = styled.h3`
  font-family: var(--font-primary);
  font-size: 0.95rem;
  letter-spacing: 0.2em;
  color: #fff;
  margin-bottom: 1.25rem;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;

  .count {
    font-family: var(--font-secondary);
    font-size: 0.7rem;
    letter-spacing: 0.15em;
    color: rgba(255, 255, 255, 0.4);
    font-weight: 500;
  }
`;

export const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

export const StatCard = styled(Panel)`
  padding: 1.25rem 1.4rem;
`;

export const StatLabel = styled.div`
  font-family: var(--font-secondary);
  font-size: 0.68rem;
  color: rgba(255, 255, 255, 0.45);
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-weight: 600;
  margin-bottom: 0.5rem;
`;

export const StatValue = styled.div`
  font-family: var(--font-primary);
  font-size: 1.7rem;
  color: ${props => props.$color || '#fff'};
  letter-spacing: 0.05em;
  line-height: 1.1;
  text-shadow: 0 0 12px rgba(65, 105, 225, 0.25);
`;

export const StatSub = styled.div`
  font-family: var(--font-secondary);
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 0.5rem;
`;

const STATUS_COLORS = {
  paid: '#34C759',
  shipped: '#6B8DD6',
  pending: '#FFCC00',
  pending_transfer: '#FFCC00',
  refunded: '#FF3B30',
  failed: '#FF3B30',
  failed_transfer: '#FF3B30',
  cancelled: '#FF3B30',
  claimed: '#34C759',
  unclaimed: 'rgba(255,255,255,0.5)',
  available: '#34C759',
  allocated: '#FFCC00',
  transferred: '#34C759',
  resolved: '#34C759',
  retried: '#6B8DD6',
  active: '#34C759',
  revoked: '#FF3B30',
  admin: '#6B8DD6',
  user: 'rgba(255,255,255,0.5)',
};

export const StatusChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.65rem;
  border-radius: 50px;
  font-family: var(--font-secondary);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  color: ${props => STATUS_COLORS[props.$status] || 'rgba(255,255,255,0.7)'};
  background: ${props => {
    const c = STATUS_COLORS[props.$status] || 'rgba(255,255,255,0.5)';
    return c.startsWith('#') ? `${c}1f` : 'rgba(255,255,255,0.06)';
  }};
  border: 1px solid ${props => {
    const c = STATUS_COLORS[props.$status] || 'rgba(255,255,255,0.4)';
    return c.startsWith('#') ? `${c}55` : 'rgba(255,255,255,0.15)';
  }};
`;

export const TableWrap = styled.div`
  overflow-x: auto;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-secondary);
  font-size: 0.82rem;

  thead th {
    text-align: left;
    padding: 0.7rem 0.9rem;
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: rgba(255, 255, 255, 0.4);
    font-weight: 600;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(0, 0, 0, 0.25);
    white-space: nowrap;
  }

  tbody td {
    padding: 0.7rem 0.9rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.85);
    vertical-align: middle;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }
`;

export const ClickableRow = styled.tr`
  cursor: pointer;
  transition: background 0.15s ease;
  &:hover { background: rgba(65, 105, 225, 0.08); }
`;

export const Button = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.65rem 1.3rem;
  border-radius: 10px;
  font-family: var(--font-secondary);
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #fff;
  background: ${props => props.$variant === 'danger'
    ? 'rgba(255, 59, 48, 0.15)'
    : props.$variant === 'ghost'
      ? 'rgba(255, 255, 255, 0.05)'
      : 'linear-gradient(135deg, #4169E1, #2e4fb8)'};
  border: 1px solid ${props => props.$variant === 'danger'
    ? 'rgba(255, 59, 48, 0.4)'
    : props.$variant === 'ghost'
      ? 'rgba(255, 255, 255, 0.12)'
      : 'rgba(107, 141, 214, 0.4)'};
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px ${props => props.$variant === 'danger'
      ? 'rgba(255, 59, 48, 0.25)'
      : 'rgba(65, 105, 225, 0.35)'};
    border-color: ${props => props.$variant === 'danger' ? '#FF3B30' : 'var(--vault-accent-bright)'};
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

export const SmallButton = styled(Button)`
  padding: 0.4rem 0.8rem;
  font-size: 0.68rem;
  border-radius: 8px;
`;

export const Input = styled.input`
  width: 100%;
  padding: 0.75rem 1rem;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: #fff;
  font-family: var(--font-secondary);
  font-size: 0.9rem;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: var(--vault-accent);
    box-shadow: 0 0 0 3px rgba(65, 105, 225, 0.15);
  }

  &::placeholder { color: rgba(255, 255, 255, 0.3); }
`;

export const Select = styled.select`
  padding: 0.6rem 0.9rem;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: #fff;
  font-family: var(--font-secondary);
  font-size: 0.8rem;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: var(--vault-accent);
  }

  option { background: #0a0f1e; color: #fff; }
`;

export const Spinner = styled.div`
  width: ${props => props.$size || '28px'};
  height: ${props => props.$size || '28px'};
  border: 3px solid rgba(255, 255, 255, 0.12);
  border-top-color: var(--vault-accent);
  border-radius: 50%;
  animation: ${spin} 0.9s linear infinite;
`;

export const LoadingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.9rem;
  padding: 3rem 1rem;
  color: rgba(255, 255, 255, 0.45);
  font-family: var(--font-secondary);
  font-size: 0.8rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
`;

export const EmptyState = styled.div`
  padding: 2.5rem 1rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.35);
  font-family: var(--font-secondary);
  font-size: 0.85rem;
  letter-spacing: 0.05em;
`;

export const ErrorBanner = styled.div`
  padding: 0.85rem 1.1rem;
  border-radius: 10px;
  background: rgba(255, 59, 48, 0.1);
  border: 1px solid rgba(255, 59, 48, 0.35);
  color: #FF8A80;
  font-family: var(--font-secondary);
  font-size: 0.82rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
`;

const CopySpan = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  cursor: copy;
  font-family: 'Courier New', monospace;
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.85);
  transition: color 0.15s ease;

  svg { opacity: 0.4; font-size: 0.7rem; flex-shrink: 0; }
  &:hover { color: var(--vault-accent-bright); svg { opacity: 1; } }
`;

/** Truncated value with title tooltip + click-to-copy */
export const CopyValue = ({ value, head = 8, tail = 6 }) => {
  const [copied, setCopied] = useState(false);
  if (value == null || value === '') return <>—</>;
  const s = String(value);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(s);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch { /* clipboard unavailable */ }
  };
  return (
    <CopySpan title={`${s} — click to copy`} onClick={copy}>
      {copied ? <FaCheck style={{ color: '#34C759', opacity: 1 }} /> : <FaCopy />}
      {truncateMiddle(s, head, tail)}
    </CopySpan>
  );
};

const RefreshBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.7rem;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.55);
  font-family: var(--font-secondary);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  transition: all 0.2s ease;

  svg { font-size: 0.65rem; }
  svg.spinning { animation: ${spin} 0.9s linear infinite; }
  &:hover:not(:disabled) { color: #fff; border-color: var(--vault-accent); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

export const RefreshButton = ({ onClick, loading }) => (
  <RefreshBtn onClick={onClick} disabled={loading}>
    <FaSyncAlt className={loading ? 'spinning' : ''} /> Refresh
  </RefreshBtn>
);
