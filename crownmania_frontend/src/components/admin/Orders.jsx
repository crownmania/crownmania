import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { AnimatePresence, motion } from 'framer-motion';
import { FaTimes, FaTruck } from 'react-icons/fa';
import { adminRequest, AdminAuthError } from '../../services/adminApi';
import {
  Panel, PanelTitle, StatusChip, TableWrap, Table, ClickableRow,
  LoadingRow, Spinner, EmptyState, ErrorBanner, RefreshButton, CopyValue,
  Button, Input, Select,
  formatDate, formatMoney, summarizeItems, truncateMiddle,
} from './shared';

const STATUS_FILTERS = ['all', 'paid', 'shipped', 'pending', 'refunded'];
const CARRIERS = ['usps', 'ups', 'fedex', 'dhl'];

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`;

const DrawerOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 1, 5, 0.7);
  backdrop-filter: blur(6px);
  z-index: 3000;
`;

const Drawer = styled(motion.aside)`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(520px, 92vw);
  background: linear-gradient(160deg, rgba(8, 12, 28, 0.98), rgba(3, 5, 15, 0.98));
  border-left: 1px solid rgba(65, 105, 225, 0.3);
  box-shadow: -20px 0 60px rgba(0, 0, 0, 0.7);
  z-index: 3001;
  overflow-y: auto;
  padding: 1.75rem;
`;

const DrawerHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;

  h3 {
    font-family: var(--font-primary);
    font-size: 0.9rem;
    letter-spacing: 0.15em;
    margin-bottom: 0.4rem;
    word-break: break-all;
  }
`;

const CloseBtn = styled.button`
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.7);
  flex-shrink: 0;
  transition: all 0.2s ease;

  &:hover { color: #fff; border-color: var(--vault-accent); }
`;

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const DetailItem = styled.div`
  .label {
    font-family: var(--font-secondary);
    font-size: 0.62rem;
    color: rgba(255, 255, 255, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.15em;
    font-weight: 600;
    margin-bottom: 0.3rem;
  }
  .value {
    font-family: var(--font-secondary);
    font-size: 0.85rem;
    color: #fff;
    word-break: break-word;
  }
`;

const SubPanel = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 12px;
  padding: 1.1rem;
  margin-bottom: 1rem;

  h4 {
    font-family: var(--font-secondary);
    font-size: 0.68rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.45);
    margin-bottom: 0.75rem;
    font-weight: 700;
  }
`;

const SerialList = styled.ul`
  list-style: none;
  font-family: 'Courier New', monospace;
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.75);

  li {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.35rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }
  li:last-child { border-bottom: none; }
`;

const ShipForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const ShipRow = styled.div`
  display: flex;
  gap: 0.6rem;

  ${Input} { flex: 1; }
`;

const AddressBlock = styled.div`
  font-family: var(--font-secondary);
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.7;
  white-space: pre-line;
`;

const renderAddress = (addr) => {
  if (!addr) return '—';
  if (typeof addr === 'string') return addr;
  const parts = [
    addr.name,
    addr.line1 || addr.addressLine1 || addr.street,
    addr.line2 || addr.addressLine2,
    [addr.city, addr.state].filter(Boolean).join(', ') + (addr.postalCode || addr.postal_code || addr.zip ? ` ${addr.postalCode || addr.postal_code || addr.zip}` : ''),
    addr.country,
  ].filter(Boolean);
  return parts.join('\n') || JSON.stringify(addr);
};

const OrderDrawer = ({ orderId, onClose, notify, onAuthError, onShipped }) => {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tracking, setTracking] = useState('');
  const [carrier, setCarrier] = useState('usps');
  const [shipping, setShipping] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminRequest(`/api/admin/orders/${encodeURIComponent(orderId)}`);
      setDetail(data);
      setTracking(data?.order?.trackingNumber || '');
    } catch (e) {
      if (e instanceof AdminAuthError) { onAuthError(e.message); return; }
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [orderId, onAuthError]);

  useEffect(() => { load(); }, [load]);

  const ship = async () => {
    if (!tracking.trim()) {
      notify('Tracking number is required', 'error');
      return;
    }
    if (!window.confirm(`Mark order ${orderId} as shipped via ${carrier.toUpperCase()}?\nTracking: ${tracking.trim()}\n\nThis emails the customer a shipping confirmation.`)) {
      return;
    }
    setShipping(true);
    try {
      const result = await adminRequest(`/api/admin/orders/${encodeURIComponent(orderId)}/ship`, {
        method: 'POST',
        body: { trackingNumber: tracking.trim(), carrier },
      });
      notify(result?.message || 'Order marked as shipped');
      await load();
      onShipped?.();
    } catch (e) {
      if (e instanceof AdminAuthError) { onAuthError(e.message); return; }
      notify(e.message, 'error');
    } finally {
      setShipping(false);
    }
  };

  const order = detail?.order;
  const inventoryItems = detail?.inventoryItems || [];

  return (
    <>
      <DrawerOverlay
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <Drawer
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'tween', duration: 0.25 }}
      >
        <DrawerHeader>
          <div>
            <h3>ORDER {orderId}</h3>
            {order && <StatusChip $status={order.status}>{order.status || 'unknown'}</StatusChip>}
          </div>
          <CloseBtn onClick={onClose} aria-label="Close"><FaTimes /></CloseBtn>
        </DrawerHeader>

        {loading ? (
          <LoadingRow><Spinner /> Loading order</LoadingRow>
        ) : error ? (
          <ErrorBanner><span>{error}</span><RefreshButton onClick={load} loading={loading} /></ErrorBanner>
        ) : !order ? (
          <EmptyState>Order not found</EmptyState>
        ) : (
          <>
            <DetailGrid>
              <DetailItem>
                <div className="label">Customer</div>
                <div className="value">{order.customerEmail || '—'}</div>
              </DetailItem>
              <DetailItem>
                <div className="label">Total</div>
                <div className="value">{formatMoney(order.total)}</div>
              </DetailItem>
              <DetailItem>
                <div className="label">Items</div>
                <div className="value">{summarizeItems(order.items)}</div>
              </DetailItem>
              <DetailItem>
                <div className="label">Placed</div>
                <div className="value">{formatDate(order.createdAt)}</div>
              </DetailItem>
              <DetailItem>
                <div className="label">Tracking</div>
                <div className="value">
                  {order.trackingNumber ? <CopyValue value={order.trackingNumber} head={10} tail={6} /> : '—'}
                </div>
              </DetailItem>
              <DetailItem>
                <div className="label">Confirmation Email</div>
                <div className="value">
                  {order.confirmationEmailSent == null ? '—'
                    : <StatusChip $status={order.confirmationEmailSent ? 'paid' : 'failed'}>
                        {order.confirmationEmailSent ? 'sent' : 'not sent'}
                      </StatusChip>}
                </div>
              </DetailItem>
            </DetailGrid>

            <SubPanel>
              <h4>Shipping Address</h4>
              <AddressBlock>{renderAddress(order.shippingAddress)}</AddressBlock>
            </SubPanel>

            {order.allocatedSerials?.length > 0 && (
              <SubPanel>
                <h4>Allocated Serials</h4>
                <SerialList>
                  {order.allocatedSerials.map((s, i) => (
                    <li key={i}><span>{typeof s === 'object' ? (s.serialNumber || JSON.stringify(s)) : s}</span></li>
                  ))}
                </SerialList>
              </SubPanel>
            )}

            {inventoryItems.length > 0 && (
              <SubPanel>
                <h4>Inventory Items</h4>
                <SerialList>
                  {inventoryItems.map((inv, i) => (
                    <li key={i}>
                      <span>{inv.serialNumber || inv.productId || `#${i + 1}`}</span>
                      <StatusChip $status={inv.status}>{inv.status || '—'}</StatusChip>
                    </li>
                  ))}
                </SerialList>
              </SubPanel>
            )}

            <SubPanel>
              <h4><FaTruck style={{ marginRight: '0.4rem' }} />Mark Shipped</h4>
              <ShipForm>
                <ShipRow>
                  <Input
                    placeholder="Tracking number"
                    value={tracking}
                    onChange={(e) => setTracking(e.target.value)}
                  />
                  <Select value={carrier} onChange={(e) => setCarrier(e.target.value)}>
                    {CARRIERS.map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                  </Select>
                </ShipRow>
                <Button onClick={ship} disabled={shipping || !tracking.trim()}>
                  {shipping ? 'Sending…' : 'Mark Shipped + Email Customer'}
                </Button>
              </ShipForm>
            </SubPanel>
          </>
        )}
      </Drawer>
    </>
  );
};

const Orders = ({ notify, onAuthError, openOrderId, onOrderOpened }) => {
  const [orders, setOrders] = useState(null);
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async (statusFilter = status) => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ limit: '50' });
      if (statusFilter && statusFilter !== 'all') qs.set('status', statusFilter);
      const data = await adminRequest(`/api/admin/orders?${qs}`);
      setOrders(data.orders || []);
    } catch (e) {
      if (e instanceof AdminAuthError) { onAuthError(e.message); return; }
      setError(e.message);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [status, onAuthError]);

  useEffect(() => { load(status); }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Deep-link from Dashboard recent orders
  useEffect(() => {
    if (openOrderId) {
      setSelectedId(openOrderId);
      onOrderOpened?.();
    }
  }, [openOrderId, onOrderOpened]);

  const list = orders || [];

  return (
    <Panel>
      <PanelTitle>
        Orders
        <span className="count">{list.length} shown</span>
      </PanelTitle>

      <Toolbar>
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS_FILTERS.map((sf) => (
            <option key={sf} value={sf}>{sf === 'all' ? 'All statuses' : sf}</option>
          ))}
        </Select>
        <RefreshButton onClick={() => load()} loading={loading} />
      </Toolbar>

      {error && (
        <ErrorBanner><span>{error}</span><RefreshButton onClick={() => load()} loading={loading} /></ErrorBanner>
      )}

      {loading ? (
        <LoadingRow><Spinner /> Loading orders</LoadingRow>
      ) : !list.length ? (
        <EmptyState>No orders match this filter</EmptyState>
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Tracking</th><th>Date</th>
              </tr>
            </thead>
            <tbody>
              {list.map((o) => (
                <ClickableRow key={o.id} onClick={() => setSelectedId(o.id)}>
                  <td><CopyValue value={o.id} head={6} tail={4} /></td>
                  <td>{o.customerEmail || '—'}</td>
                  <td title={summarizeItems(o.items)}>{truncateMiddle(summarizeItems(o.items), 14, 8)}</td>
                  <td>{formatMoney(o.total)}</td>
                  <td><StatusChip $status={o.status}>{o.status || 'unknown'}</StatusChip></td>
                  <td>{o.trackingNumber ? <CopyValue value={o.trackingNumber} head={8} tail={4} /> : '—'}</td>
                  <td>{formatDate(o.createdAt)}</td>
                </ClickableRow>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}

      <AnimatePresence>
        {selectedId && (
          <OrderDrawer
            orderId={selectedId}
            onClose={() => setSelectedId(null)}
            notify={notify}
            onAuthError={onAuthError}
            onShipped={() => load()}
          />
        )}
      </AnimatePresence>
    </Panel>
  );
};

export default Orders;
