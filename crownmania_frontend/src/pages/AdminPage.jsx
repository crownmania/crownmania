import { useCallback, useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FaChartPie, FaBox, FaTicketAlt, FaUsers, FaExclamationTriangle,
  FaSignOutAlt, FaFileDownload, FaShieldAlt, FaSignal,
} from 'react-icons/fa';

import {
  adminRequest, adminDownload, getAdminToken, setAdminToken, clearAdminToken,
  AdminAuthError,
} from '../services/adminApi';
import crownLogo from '../assets/crown_logo_white.svg';
import blueprintBg from '../assets/crownmania_blueprint.svg';
import Dashboard from '../components/admin/Dashboard';
import Orders from '../components/admin/Orders';
import Claims from '../components/admin/Claims';
import Users from '../components/admin/Users';
import Failures from '../components/admin/Failures';
import Live from '../components/admin/Live';
import {
  Panel, Input, Button, Spinner, ErrorBanner, SmallButton,
} from '../components/admin/shared';

// ============================================
// STYLED COMPONENTS
// ============================================

const AdminRoot = styled.div`
  min-height: calc(100vh - 80px);
  position: relative;
  color: #fff;
`;

const BlueprintBackground = styled.div`
  position: fixed;
  inset: 0;
  background-image: url(${blueprintBg});
  background-size: 600px;
  background-repeat: repeat;
  opacity: 0.05;
  pointer-events: none;
  z-index: 0;
  mask-image: radial-gradient(circle at 30% 30%, black 30%, transparent 90%);
`;

// ---------- Login ----------

const LoginWrap = styled.div`
  min-height: calc(100vh - 80px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  position: relative;
  z-index: 1;
`;

const LoginCard = styled(Panel)`
  width: 100%;
  max-width: 420px;
  padding: 2.75rem 2.5rem;
  text-align: center;
  border-radius: 22px;
`;

const LogoImg = styled.img`
  height: 56px;
  width: auto;
  margin-bottom: 1.25rem;
  filter: drop-shadow(0 0 14px rgba(255, 255, 255, 0.25));
`;

const Wordmark = styled.h1`
  font-family: var(--font-primary);
  font-size: 1.4rem;
  letter-spacing: 0.25em;
  margin-bottom: 0.35rem;
  color: #fff;
  text-shadow: 0 0 12px rgba(255, 255, 255, 0.25);
`;

const AdminBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.3rem 0.9rem;
  border-radius: 50px;
  border: 1px solid rgba(107, 141, 214, 0.45);
  background: rgba(65, 105, 225, 0.12);
  color: var(--vault-accent-bright);
  font-family: var(--font-secondary);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  margin-bottom: 2rem;
`;

const LoginHint = styled.p`
  font-family: var(--font-secondary);
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.45);
  margin-bottom: 1.5rem;
`;

const CodeInput = styled(Input)`
  text-align: center;
  font-family: 'Courier New', monospace;
  font-size: 1.4rem;
  letter-spacing: 0.5em;
  font-weight: 700;
`;

const FormStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
`;

const LinkButton = styled.button`
  font-family: var(--font-secondary);
  font-size: 0.75rem;
  color: var(--vault-accent-bright);
  letter-spacing: 0.05em;
  margin-top: 0.5rem;
  &:hover { text-decoration: underline; }
`;

const Centered = styled.div`
  min-height: calc(100vh - 80px);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: rgba(255, 255, 255, 0.45);
  font-family: var(--font-secondary);
  font-size: 0.8rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
`;

// ---------- Shell ----------

const Shell = styled.div`
  display: flex;
  min-height: calc(100vh - 80px);
  position: relative;
  z-index: 1;
`;

const Sidebar = styled.aside`
  width: 230px;
  flex-shrink: 0;
  border-right: 1px solid rgba(65, 105, 225, 0.15);
  background: rgba(0, 3, 12, 0.75);
  backdrop-filter: blur(16px);
  padding: 1.5rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  position: sticky;
  top: 80px;
  height: calc(100vh - 80px);
  overflow-y: auto;

  @media (max-width: 860px) {
    width: 190px;
    padding: 1rem 0.6rem;
  }
`;

const SideLabel = styled.div`
  font-family: var(--font-secondary);
  font-size: 0.6rem;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.3);
  font-weight: 700;
  padding: 0.9rem 0.75rem 0.4rem;
`;

const NavItem = styled.button`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 0.9rem;
  border-radius: 10px;
  font-family: var(--font-secondary);
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${props => props.$active ? '#fff' : 'rgba(255,255,255,0.5)'};
  background: ${props => props.$active ? 'rgba(65, 105, 225, 0.22)' : 'transparent'};
  border: 1px solid ${props => props.$active ? 'rgba(107, 141, 214, 0.45)' : 'transparent'};
  transition: all 0.2s ease;
  text-align: left;

  svg { font-size: 0.85rem; color: ${props => props.$active ? 'var(--vault-accent-bright)' : 'rgba(255,255,255,0.4)'}; }

  &:hover {
    color: #fff;
    background: rgba(65, 105, 225, 0.12);
  }
`;

const ExportButton = styled(NavItem)`
  font-size: 0.72rem;
  padding: 0.6rem 0.9rem;
`;

const Main = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
`;

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.1rem 1.75rem;
  border-bottom: 1px solid rgba(65, 105, 225, 0.15);
  background: rgba(0, 3, 12, 0.6);
  backdrop-filter: blur(12px);
  position: sticky;
  top: 80px;
  z-index: 50;

  @media (max-width: 700px) {
    flex-wrap: wrap;
    padding: 0.9rem 1rem;
  }
`;

const TopBarTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;

  img { height: 30px; width: auto; }

  .wordmark {
    font-family: var(--font-primary);
    font-size: 0.95rem;
    letter-spacing: 0.2em;
    color: #fff;
  }
  .admin-tag {
    font-family: var(--font-secondary);
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.3em;
    color: var(--vault-accent-bright);
    border: 1px solid rgba(107, 141, 214, 0.45);
    padding: 0.15rem 0.55rem;
    border-radius: 50px;
  }
`;

const TopBarRight = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;

  .email {
    font-family: var(--font-secondary);
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.45);
  }
`;

const Content = styled.div`
  padding: 1.75rem;
  flex: 1;

  @media (max-width: 700px) {
    padding: 1rem;
  }
`;

// ---------- Toast ----------

const Toast = styled(motion.div)`
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background: ${props => props.$error ? 'rgba(40, 8, 8, 0.95)' : 'rgba(8, 20, 45, 0.95)'};
  color: ${props => props.$error ? '#FF8A80' : '#fff'};
  padding: 0.8rem 1.6rem;
  border-radius: 50px;
  font-family: var(--font-secondary);
  font-weight: 500;
  font-size: 0.85rem;
  z-index: 5000;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  border: 1px solid ${props => props.$error ? 'rgba(255, 59, 48, 0.5)' : 'rgba(107, 141, 214, 0.5)'};
  max-width: 90vw;
  text-align: center;
`;

// ============================================
// LOGIN
// ============================================

const AdminLogin = ({ onAuthenticated, notice }) => {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const sendCode = async (e) => {
    e?.preventDefault();
    if (!email.trim()) { setError('Enter your admin email'); return; }
    setBusy(true);
    setError('');
    try {
      const result = await adminRequest('/api/admin/login', {
        method: 'POST',
        body: { email: email.trim() },
        auth: false,
      });
      setInfo(result?.message || 'If that email is an admin, a code was sent.');
      setStep('code');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e) => {
    e?.preventDefault();
    if (!code.trim()) { setError('Enter the 6-digit code'); return; }
    setBusy(true);
    setError('');
    try {
      const result = await adminRequest('/api/admin/verify', {
        method: 'POST',
        body: { email: email.trim(), code: code.trim() },
        auth: false,
      });
      if (result?.token) {
        setAdminToken(result.token);
        onAuthenticated(email.trim());
      } else {
        setError(result?.message || 'Verification failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <LoginWrap>
      <LoginCard>
        <LogoImg src={crownLogo} alt="Crownmania" />
        <Wordmark>CROWNMANIA</Wordmark>
        <AdminBadge><FaShieldAlt /> ADMIN</AdminBadge>

        {notice && <ErrorBanner style={{ textAlign: 'left' }}><span>{notice}</span></ErrorBanner>}
        {error && <ErrorBanner style={{ textAlign: 'left' }}><span>{error}</span></ErrorBanner>}

        {step === 'email' ? (
          <form onSubmit={sendCode}>
            <LoginHint>Sign in with your admin email. We&apos;ll send a one-time code.</LoginHint>
            <FormStack>
              <Input
                type="email"
                placeholder="admin@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                autoComplete="email"
              />
              <Button type="submit" disabled={busy}>
                {busy ? 'Sending…' : 'Send Login Code'}
              </Button>
            </FormStack>
          </form>
        ) : (
          <form onSubmit={verify}>
            <LoginHint>{info || `Enter the 6-digit code sent to ${email}`}</LoginHint>
            <FormStack>
              <CodeInput
                type="text"
                inputMode="numeric"
                placeholder="••••••"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                autoFocus
                autoComplete="one-time-code"
              />
              <Button type="submit" disabled={busy || code.length !== 6}>
                {busy ? 'Verifying…' : 'Verify & Sign In'}
              </Button>
              <LinkButton type="button" onClick={() => { setStep('email'); setCode(''); setError(''); setInfo(''); }}>
                ← Use a different email
              </LinkButton>
              <LinkButton type="button" onClick={sendCode} disabled={busy}>
                Resend code
              </LinkButton>
            </FormStack>
          </form>
        )}
      </LoginCard>
    </LoginWrap>
  );
};

// ============================================
// PAGE
// ============================================

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: FaChartPie },
  { id: 'live', label: 'Live Traffic', icon: FaSignal },
  { id: 'orders', label: 'Orders', icon: FaBox },
  { id: 'claims', label: 'Claims', icon: FaTicketAlt },
  { id: 'users', label: 'Users', icon: FaUsers },
  { id: 'failures', label: 'Failures', icon: FaExclamationTriangle },
];

const EXPORTS = [
  { path: '/api/admin/export/collectibles', label: 'Collectibles CSV', fallback: 'collectibles.csv' },
  { path: '/api/admin/export/users', label: 'Users CSV', fallback: 'users.csv' },
];

const AdminPage = () => {
  const [authState, setAuthState] = useState('checking'); // checking | unauthenticated | authenticated
  const [email, setEmail] = useState('');
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState('dashboard');
  const [toast, setToast] = useState(null);
  const [pendingOrderId, setPendingOrderId] = useState(null);
  const [exporting, setExporting] = useState('');
  const toastTimer = useRef(null);

  const notify = useCallback((message, type = 'success') => {
    setToast({ message, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const handleAuthError = useCallback((message) => {
    clearAdminToken();
    setAuthState('unauthenticated');
    setNotice(message || 'Session expired. Please sign in again.');
  }, []);

  // Validate an existing token on mount
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!getAdminToken()) {
        setAuthState('unauthenticated');
        return;
      }
      try {
        const data = await adminRequest('/api/admin/session');
        if (cancelled) return;
        if (data?.valid) {
          setEmail(data.email || '');
          setAuthState('authenticated');
        } else {
          clearAdminToken();
          setAuthState('unauthenticated');
        }
      } catch (e) {
        if (cancelled) return;
        clearAdminToken();
        setAuthState('unauthenticated');
        if (!(e instanceof AdminAuthError)) {
          setNotice('Could not validate session — please sign in again.');
        }
      }
    };
    check();
    return () => { cancelled = true; };
  }, []);

  const logout = async () => {
    try {
      await adminRequest('/api/admin/logout', { method: 'POST' });
    } catch { /* local logout regardless */ }
    clearAdminToken();
    setEmail('');
    setAuthState('unauthenticated');
    setNotice('Signed out.');
  };

  const onAuthenticated = (userEmail) => {
    setEmail(userEmail);
    setNotice('');
    setAuthState('authenticated');
    setTab('dashboard');
    notify('Signed in');
  };

  const selectOrder = (orderId) => {
    setPendingOrderId(orderId);
    setTab('orders');
  };

  const runExport = async (exp) => {
    setExporting(exp.path);
    try {
      await adminDownload(exp.path, exp.fallback);
      notify(`${exp.label} downloaded`);
    } catch (e) {
      if (e instanceof AdminAuthError) { handleAuthError(e.message); return; }
      notify(e.message, 'error');
    } finally {
      setExporting('');
    }
  };

  return (
    <AdminRoot>
      <BlueprintBackground />

      {authState === 'checking' && (
        <Centered><Spinner /> Checking session</Centered>
      )}

      {authState === 'unauthenticated' && (
        <AdminLogin onAuthenticated={onAuthenticated} notice={notice} />
      )}

      {authState === 'authenticated' && (
        <Shell>
          <Sidebar>
            <SideLabel>Admin</SideLabel>
            {TABS.map(({ id, label, icon: Icon }) => (
              <NavItem key={id} $active={tab === id} onClick={() => setTab(id)}>
                <Icon /> {label}
              </NavItem>
            ))}

            <SideLabel>Exports</SideLabel>
            {EXPORTS.map((exp) => (
              <ExportButton
                key={exp.path}
                onClick={() => runExport(exp)}
                disabled={exporting === exp.path}
              >
                <FaFileDownload /> {exporting === exp.path ? 'Exporting…' : exp.label}
              </ExportButton>
            ))}
          </Sidebar>

          <Main>
            <TopBar>
              <TopBarTitle>
                <img src={crownLogo} alt="" />
                <span className="wordmark">CROWNMANIA</span>
                <span className="admin-tag">ADMIN</span>
              </TopBarTitle>
              <TopBarRight>
                {email && <span className="email">{email}</span>}
                <SmallButton $variant="ghost" onClick={logout}>
                  <FaSignOutAlt /> Logout
                </SmallButton>
              </TopBarRight>
            </TopBar>

            <Content>
              {tab === 'dashboard' && (
                <Dashboard notify={notify} onAuthError={handleAuthError} onSelectOrder={selectOrder} />
              )}
              {tab === 'orders' && (
                <Orders
                  notify={notify}
                  onAuthError={handleAuthError}
                  openOrderId={pendingOrderId}
                  onOrderOpened={() => setPendingOrderId(null)}
                />
              )}
              {tab === 'live' && <Live onAuthError={handleAuthError} />}
              {tab === 'claims' && <Claims notify={notify} onAuthError={handleAuthError} />}
              {tab === 'users' && <Users notify={notify} onAuthError={handleAuthError} />}
              {tab === 'failures' && <Failures notify={notify} onAuthError={handleAuthError} />}
            </Content>
          </Main>
        </Shell>
      )}

      <AnimatePresence>
        {toast && (
          <Toast
            key="admin-toast"
            $error={toast.type === 'error'}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
          >
            {toast.message}
          </Toast>
        )}
      </AnimatePresence>
    </AdminRoot>
  );
};

export default AdminPage;
