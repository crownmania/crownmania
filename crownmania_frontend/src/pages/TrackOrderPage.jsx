import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBoxOpen, FaEnvelope, FaKey, FaTruck, FaCheckCircle, FaSpinner } from 'react-icons/fa';

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5001' : 'https://crownmania-backend-production.up.railway.app');

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const Page = styled.div`
  min-height: calc(100vh - 80px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  color: #fff;
`;

const Card = styled(motion.div)`
  width: 100%;
  max-width: 520px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(107, 141, 214, 0.25);
  border-radius: 22px;
  padding: 2.75rem 2.5rem;
  backdrop-filter: blur(16px);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
`;

const Title = styled.h1`
  font-family: var(--font-primary);
  font-size: 1.5rem;
  letter-spacing: 0.2em;
  text-align: center;
  margin-bottom: 0.5rem;
`;

const Subtitle = styled.p`
  font-family: var(--font-secondary);
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
  margin-bottom: 2rem;
  line-height: 1.6;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.9rem 1.1rem;
  border-radius: 12px;
  border: 1px solid rgba(107, 141, 214, 0.3);
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
  font-family: var(--font-secondary);
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.2s ease;
  &:focus { border-color: var(--vault-accent-bright, #6b8dd6); }
  &::placeholder { color: rgba(255, 255, 255, 0.3); }
`;

const CodeInput = styled(Input)`
  text-align: center;
  font-family: 'Courier New', monospace;
  font-size: 1.5rem;
  letter-spacing: 0.5em;
  font-weight: 700;
`;

const Button = styled(motion.button)`
  width: 100%;
  padding: 0.95rem;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #4169e1 0%, #6b8dd6 100%);
  color: #fff;
  font-family: var(--font-secondary);
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const ErrorText = styled.p`
  color: #ff8a80;
  font-family: var(--font-secondary);
  font-size: 0.8rem;
  margin: 0.75rem 0 0;
  text-align: center;
`;

const LinkButton = styled.button`
  background: none;
  border: none;
  color: var(--vault-accent-bright, #6b8dd6);
  font-family: var(--font-secondary);
  font-size: 0.75rem;
  cursor: pointer;
  margin-top: 1rem;
  width: 100%;
  text-align: center;
  &:hover { text-decoration: underline; }
`;

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
`;

const SpinnerIcon = styled(FaSpinner)`
  animation: ${spin} 1s linear infinite;
`;

const OrderCard = styled.div`
  border: 1px solid rgba(107, 141, 214, 0.25);
  border-radius: 14px;
  padding: 1.1rem 1.25rem;
  margin-bottom: 1rem;
  background: rgba(0, 0, 0, 0.25);
  text-align: left;
`;

const OrderHead = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 0.6rem;
`;

const OrderId = styled.span`
  font-family: 'Courier New', monospace;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
`;

const StatusBadge = styled.span`
  font-family: var(--font-secondary);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  padding: 0.25rem 0.7rem;
  border-radius: 50px;
  border: 1px solid ${p => p.$shipped ? 'rgba(0,255,136,0.5)' : 'rgba(107,141,214,0.5)'};
  color: ${p => p.$shipped ? '#00ff88' : 'var(--vault-accent-bright, #6b8dd6)'};
`;

const OrderMeta = styled.div`
  font-family: var(--font-secondary);
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.8;
`;

const Tracking = styled.div`
  margin-top: 0.6rem;
  padding-top: 0.6rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-family: 'Courier New', monospace;
  font-size: 0.8rem;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const EmptyState = styled.div`
  text-align: center;
  color: rgba(255, 255, 255, 0.55);
  font-family: var(--font-secondary);
  font-size: 0.85rem;
  padding: 1.5rem 0;
  line-height: 1.8;
`;

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatMoney = (total, currency = 'usd') => {
  if (total == null) return '—';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase() }).format(total);
  } catch {
    return `$${Number(total).toFixed(2)}`;
  }
};

const statusLabel = (status, shippedAt) => {
  if (shippedAt || status === 'shipped' || status === 'delivered') return 'shipped';
  if (status === 'refunded') return 'refunded';
  if (status === 'cancelled' || status === 'canceled') return 'cancelled';
  return 'processing';
};

export default function TrackOrderPage() {
  const [step, setStep] = useState('email'); // email | code | orders
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [orders, setOrders] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const requestCode = async (e) => {
    e?.preventDefault();
    if (!email.trim()) { setError('Enter the email you used at checkout.'); return; }
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/lookup/request-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send code');
      setStep('code');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (e) => {
    e?.preventDefault();
    if (code.trim().length !== 6) { setError('Enter the 6-digit code from your email.'); return; }
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/lookup/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      setOrders(data.orders || []);
      setStep('orders');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <Card
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Title><FaBoxOpen style={{ marginRight: '0.6rem', verticalAlign: '-0.1em' }} />TRACK ORDER</Title>

        <AnimatePresence mode="wait">
          {step === 'email' && (
            <motion.div key="email" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Subtitle>
                Enter the email address you used at checkout and we&apos;ll send you a one-time code to view your orders.
              </Subtitle>
              <form onSubmit={requestCode}>
                <Stack>
                  <Input
                    type="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    autoFocus
                    autoComplete="email"
                  />
                  <Button type="submit" disabled={busy} whileTap={{ scale: 0.98 }}>
                    {busy ? <SpinnerIcon /> : <FaEnvelope />} {busy ? 'Sending…' : 'Send Code'}
                  </Button>
                </Stack>
              </form>
            </motion.div>
          )}

          {step === 'code' && (
            <motion.div key="code" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Subtitle>
                Enter the 6-digit code sent to <strong style={{ color: '#fff' }}>{email}</strong>. It expires in 10 minutes.
              </Subtitle>
              <form onSubmit={verifyCode}>
                <Stack>
                  <CodeInput
                    type="text"
                    inputMode="numeric"
                    placeholder="••••••"
                    maxLength={6}
                    value={code}
                    onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setError(''); }}
                    autoFocus
                    autoComplete="one-time-code"
                  />
                  <Button type="submit" disabled={busy || code.length !== 6} whileTap={{ scale: 0.98 }}>
                    {busy ? <SpinnerIcon /> : <FaKey />} {busy ? 'Verifying…' : 'View Orders'}
                  </Button>
                </Stack>
              </form>
              <LinkButton type="button" onClick={() => { setStep('email'); setCode(''); setError(''); }}>
                ← Use a different email
              </LinkButton>
              <LinkButton type="button" onClick={requestCode} disabled={busy}>
                Resend code
              </LinkButton>
            </motion.div>
          )}

          {step === 'orders' && (
            <motion.div key="orders" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Subtitle>Orders for <strong style={{ color: '#fff' }}>{email}</strong></Subtitle>
              {orders && orders.length === 0 ? (
                <EmptyState>
                  No orders found for this email.<br />
                  <Link to="/shop" style={{ color: 'var(--vault-accent-bright, #6b8dd6)' }}>Visit the shop</Link>
                </EmptyState>
              ) : (
                orders.map((o) => {
                  const s = statusLabel(o.status, o.shippedAt);
                  return (
                    <OrderCard key={o.id}>
                      <OrderHead>
                        <OrderId>{o.id}</OrderId>
                        <StatusBadge $shipped={s === 'shipped'}>
                          {s === 'shipped' && <FaCheckCircle style={{ marginRight: '0.3rem' }} />}
                          {s}
                        </StatusBadge>
                      </OrderHead>
                      <OrderMeta>
                        {(o.items || []).map((i, idx) => (
                          <div key={idx}>{i.name} × {i.quantity}</div>
                        ))}
                        <div>Total: {formatMoney(o.total, o.currency)} · Ordered {formatDate(o.createdAt)}</div>
                      </OrderMeta>
                      {o.trackingNumber && (
                        <Tracking>
                          <FaTruck /> {o.carrier ? `${o.carrier} · ` : ''}{o.trackingNumber}
                        </Tracking>
                      )}
                    </OrderCard>
                  );
                })
              )}
              <LinkButton type="button" onClick={() => { setStep('email'); setCode(''); setOrders(null); setError(''); }}>
                ← Look up a different email
              </LinkButton>
            </motion.div>
          )}
        </AnimatePresence>

        {error && <ErrorText>{error}</ErrorText>}
      </Card>
    </Page>
  );
}
