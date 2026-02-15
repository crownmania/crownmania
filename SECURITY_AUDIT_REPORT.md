# CrownMania — Full-Stack Security Audit & Optimization Report

**Date:** 2026-02-10  
**Auditor:** Anti-Gravity (Opus 4.6)  
**Scope:** Entire CrownMania monorepo — backend, frontend, smart contracts, CI/CD, deployment

---

## 1. EXECUTIVE SUMMARY (Top 15 Findings)

| # | Severity | Finding |
|---|----------|---------|
| 1 | 🔴 **CRITICAL** | **Firebase service account private key committed to repo** (`crownmania_backend/src/config/serviceAccountKey.json`) — full project takeover possible |
| 2 | 🔴 **CRITICAL** | **Backend `.env` file on disk** with live secrets (Stripe, SendGrid, Firebase keys) — not in git, but on developer workstation |
| 3 | 🔴 **CRITICAL** | **Content DELETE endpoint has NO auth** (`DELETE /api/content/:contentId`) — any user can delete any content |
| 4 | 🟠 **HIGH** | **Content upload endpoint has NO auth** (`POST /api/content/upload`) — any user can upload 500MB files |
| 5 | 🟠 **HIGH** | **`/api/verification/issue-token` has NO auth or rate limiting** — unauthenticated token issuance |
| 6 | 🟠 **HIGH** | **`/api/verification/request-email-verification` has NO rate limiting** — email bombing attack vector |
| 7 | 🟠 **HIGH** | **Hardcoded fallback secrets** in `contentSecurity.js` (`SERIAL_HASH_SALT`, `CONTENT_ACCESS_SECRET`) and `encryptionService.js` (random key on restart) |
| 8 | 🟠 **HIGH** | **Admin `requireAdmin` middleware uses Firebase token path but admin login generates custom JWT-like session token** — two incompatible auth systems for admin |
| 9 | 🟠 **HIGH** | **In-memory nonce/session stores** (`usedNonces`, `adminSessions`, `otpStore`) — lost on restart, no multi-instance support |
| 10 | 🟡 **MEDIUM** | **CORS allows any `.vercel.app` domain** (`origin.endsWith('.vercel.app')`) — any Vercel deployment can access the API |
| 11 | 🟡 **MEDIUM** | **`sitePassword.js` has hardcoded fallback** `'your-default-password'` |
| 12 | 🟡 **MEDIUM** | **Moralis webhook signature verification skips if secret not set** — accepts any webhook in dev/missing config |
| 13 | 🟡 **MEDIUM** | **`wallet-tokens` and `verify-product` endpoints expose data without auth** — information leakage |
| 14 | 🟡 **MEDIUM** | **Validation schemas defined but NOT applied** to most route handlers |
| 15 | 🟢 **LOW** | **`500MB` file upload limit** is excessive for the use case |

**Biggest wins from fixing:**  
- Rotating the leaked service account key eliminates full-project compromise risk  
- Adding auth to content endpoints closes the widest-open attack surface  
- Moving secrets to env-only eliminates the most common repo-scanning attack  

---

## 2. SYSTEM MAP

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    USERS / CLIENTS                       │
│   Browser (React SPA) / QR Scanner / Mobile             │
└──────────────┬──────────────────────┬───────────────────┘
               │     HTTPS/WSS        │
┌──────────────▼──────────┐  ┌────────▼──────────────────┐
│   FRONTEND (Vite/React) │  │  Firebase Hosting          │
│   Vercel / localhost     │  │  Static dist2/ folder      │
│   Port 5173 (dev)        │  │  CSP + Security headers    │
└──────────────┬──────────┘  └───────────────────────────┘
               │  /api/* proxy (dev) or direct (prod)
┌──────────────▼────────────────────────────────────────┐
│   BACKEND (Express.js / Node 18 ESM)                  │
│   Railway (prod) / localhost:5001 (dev)                │
│                                                        │
│   ┌─── Middleware Layer ────────────────────────────┐  │
│   │ helmet, cors, compression, rate-limit, auth     │  │
│   └─────────────────────────────────────────────────┘  │
│                                                        │
│   ┌─── Route Modules ──────────────────────────────┐  │
│   │ /api/verification  – serial verify, claim, NFT  │  │
│   │ /api/auth          – nonce, signature, 2FA       │  │
│   │ /api/stripe        – checkout, webhook           │  │
│   │ /api/content       – upload, signed URLs         │  │
│   │ /api/admin         – OTP login, CRUD             │  │
│   │ /api/profile       – user PII (encrypted)        │  │
│   │ /api/wallet        – connect, collectibles       │  │
│   │ /api/webhooks      – Moralis NFT transfers       │  │
│   │ /api/notifications – preferences                 │  │
│   │ /api/firebase      – (proxy / misc)              │  │
│   └─────────────────────────────────────────────────┘  │
│                                                        │
│   ┌─── Service Layer ──────────────────────────────┐  │
│   │ verificationService  – claim flow (Firestore Tx)│  │
│   │ signatureService     – nonce + ethers.js verify  │  │
│   │ adminService         – OTP + session (in-memory) │  │
│   │ encryptionService    – AES-256-GCM PII           │  │
│   │ orderFulfillmentService – Stripe → serial alloc  │  │
│   │ thirdwebService      – NFT minting/transfer      │  │
│   │ queueService         – BullMQ (Redis optional)   │  │
│   │ emailService         – SendGrid                  │  │
│   │ smsService           – Twilio                    │  │
│   │ contentService       – Firebase Storage           │  │
│   │ ownershipService     – on-chain verification     │  │
│   │ nftRetryService      – transfer retry logic      │  │
│   └─────────────────────────────────────────────────┘  │
└────────────┬───────────────┬──────────────┬───────────┘
             │               │              │
    ┌────────▼────────┐ ┌────▼─────┐ ┌──────▼──────────┐
    │ Firestore (Named │ │ Stripe   │ │ Polygon (ERC721)│
    │ DB: "crownmania")│ │ Payments │ │ via Thirdweb    │
    └─────────────────┘ └──────────┘ └─────────────────┘
    
    ┌──────────────┐ ┌──────────┐ ┌───────────┐ ┌───────┐
    │ SendGrid     │ │ Twilio   │ │ Moralis   │ │ Redis │
    │ (Email)      │ │ (SMS)    │ │ (Webhooks)│ │ (Opt) │
    └──────────────┘ └──────────┘ └───────────┘ └───────┘
```

### Trust Boundaries

| Boundary | Notes |
|----------|-------|
| **Browser → Backend API** | Rate-limited, CORS-checked, some auth required |
| **Backend → Firestore** | Admin SDK (full access via service account) |
| **Backend → Stripe** | Webhook signature verified |
| **Backend → Blockchain** | Private key in env (MINTING_WALLET_PRIVATE_KEY) |
| **Backend → SendGrid/Twilio** | API keys in env |
| **Moralis → Backend** | Webhook signature optional (skips if no secret) |
| **Admin Panel → Backend** | Custom OTP system (in-memory, not Firebase Auth) |

### Crown-Jewel Assets

1. **Firebase Service Account Key** — full Firestore/Storage/Auth admin access
2. **MINTING_WALLET_PRIVATE_KEY** — controls NFT contract on Polygon
3. **STRIPE_SECRET_KEY** — can create charges, view payment data
4. **Claim Codes** — each represents a physical product + NFT entitlement
5. **User PII** — email, phone, birthday (encrypted with AES-256-GCM)
6. **Edition Counter** — determines NFT edition numbers (atomic)

---

## 3. SECURITY FINDINGS TABLE

### CRITICAL

| # | Component | Issue | Evidence | Fix Summary | Verification |
|---|-----------|-------|----------|-------------|--------------|
| S1 | `crownmania_backend/src/config/serviceAccountKey.json` | **Live Firebase SA private key committed to repo** | File contains `private_key`, `client_email`, `project_id` for `sonorous-crane-440603-s6` | 1) Rotate key in GCP IAM immediately 2) Delete file from repo + git history 3) Use env var `GOOGLE_APPLICATION_CREDENTIALS_JSON` only | `git log -- '**/serviceAccountKey*'` should return empty; GCP IAM shows old key disabled |
| S2 | `crownmania_backend/.env` (on disk, not in git) | Live secrets on developer workstation; if workstation is compromised, all keys leak | File exists at `crownmania_backend/.env` (3439 bytes) | Ensure `.env` never committed; add pre-commit hook; rotate any keys that may have been exposed | `git ls-files -- '**/.env'` returns nothing |
| S3 | `crownmania_backend/src/routes/content.js:215` | **DELETE endpoint has NO authentication** — `TODO: Add admin authentication check here` | Line 219: `// TODO: Add admin authentication check here` | Add `requireAdmin` middleware to DELETE route | Attempt `curl -X DELETE /api/content/test123` → 401 |

### HIGH

| # | Component | Issue | Evidence | Fix Summary | Verification |
|---|-----------|-------|----------|-------------|--------------|
| S4 | `content.js:52` | **Upload endpoint has NO auth** | `router.post('/upload', extractClientIP, upload.single('file'), ...)` — no auth middleware | Add `requireAdmin` or `authenticateUser` middleware | Unauthenticated POST to `/api/content/upload` → 401 |
| S5 | `verification.js:174` | **`/issue-token` has NO auth or rate limiting** | `router.post('/issue-token', async (req, res) => { ... })` | Add `authenticateWallet` + rate limiter | Unauthenticated POST → 401 |
| S6 | `verification.js:132` | **`/request-email-verification` has NO rate limiting** | No rate limiter middleware applied | Add `serialNumberLimiter` to prevent email bombing | Verify rate limit headers in response |
| S7 | `contentSecurity.js:18,53` | **Hardcoded fallback secrets** | `SERIAL_HASH_SALT` → `'REDACTED_SALT_VALUE'`; `CONTENT_ACCESS_SECRET` → `'REDACTED_CONTENT_SECRET'` | Fail-fast if env vars not set; remove hardcoded fallbacks | Server refuses to start without required secrets |
| S8 | `encryptionService.js:4` | **Random PII encryption key on restart** | `const ENCRYPTION_KEY = process.env.PII_ENCRYPTION_KEY \|\| crypto.randomBytes(32)` — encrypted data unrecoverable after restart | Fail-fast if `PII_ENCRYPTION_KEY` not set in production | Server refuses to start in prod without key |
| S9 | `adminService.js` + `requireAdmin.js` | **Admin auth mismatch** | `adminService` generates custom session tokens via OTP; `requireAdmin` checks Firebase `verifyIdToken` — these are incompatible pathways | Either unify on Firebase Custom Tokens or check admin session tokens in `requireAdmin` | Login via OTP → use token to access `/api/admin/stats` → 200 |
| S10 | `middleware/auth.js:36`, `adminService.js:19` | **In-memory stores** for nonces, sessions, OTPs | `const usedNonces = new Map()`, `const adminSessions = new Map()`, `const otpStore = new Map()` | Migrate to Firestore-backed or Redis-backed stores for production | Test: restart server → previously valid admin session rejected |

### MEDIUM

| # | Component | Issue | Evidence | Fix Summary | Verification |
|---|-----------|-------|----------|-------------|--------------|
| S11 | `server.js:125` | **CORS wildcard for Vercel** | `origin.endsWith('.vercel.app')` — any Vercel deployment accepted | Restrict to specific Vercel project slug pattern | Cross-origin request from `evil.vercel.app` → blocked |
| S12 | `sitePassword.js:1` | **Hardcoded default password** | `'your-default-password'` | Remove fallback; fail if not configured | N/A (middleware appears unused currently) |
| S13 | `webhooks.js:17` | **Moralis webhook verification skipped** | `if (!webhookSecret) { ... return true; }` | Return `false` if no secret configured (fail-closed) | Webhook without signature → 401 |
| S14 | `verification.js:195` | **Unauthenticated data exposure** | `wallet-tokens/:walletAddress` returns all tokens for any wallet without auth | Add signature verification or auth middleware | Request for arbitrary wallet → 401 |
| S15 | `middleware/validation.js` | **Validation schemas exist but not used** | Schemas defined (`serialNumberSchema`, `walletSchema`, etc.) but NOT applied in route handlers | Wire schemas into corresponding routes | Invalid input → 400 with validation details |
| S16 | `content.js:12-13` | **500MB upload limit** | `fileSize: 500 * 1024 * 1024` | Reduce to 50MB max for the use case | Upload >50MB → 413 |
| S17 | `middleware/auth.js:187-196` | **Fallback "simple" wallet auth** accepts any message containing "crownmania" or "claim" | Bypasses nonce-based replay protection | Remove simple fallback; require full secure message format | Message without nonce → rejected |
| S18 | `server.js:199-200` | **Double raw body parsing** for Stripe webhook | Raw body parser at line 199 AND again at `stripe.js:142` | Remove the duplicate; keep only the server-level one OR the route-level one | Stripe webhooks still verify correctly |

### LOW

| # | Component | Issue | Evidence | Fix Summary | Verification |
|---|-----------|-------|----------|-------------|--------------|
| S19 | `verification.js:259` | **Weak token ID generation** | `Math.random().toString(36)` is not cryptographically random | Use `crypto.randomUUID()` or `crypto.randomBytes()` | Token format changes but all tests pass |
| S20 | `.env.test` committed | Test env file with dummy keys tracked in git | `git ls-files` shows `crownmania_backend/.env.test` | Low risk (dummy values), but move to `.env.test.example` for hygiene | `git ls-files -- '**/.env.test'` returns empty |
| S21 | `server.js:110-113` | **No-origin requests allowed in production** | `if (!origin) { return callback(null, true); }` | Accept no-origin only for `/health` endpoint | Cross-origin CORS from server-to-server with origin header → check applied |
| S22 | Frontend `@sendgrid/mail` dependency | **SendGrid SDK in frontend package.json** | `crownmania_frontend/package.json` line 19 | Remove — email should only be sent from backend | Bundle size decreases; no functionality change |
| S23 | `ci.yml:40` | **Secret scan doesn't check config dir** | `grep` only scans `src/` — misses `serviceAccountKey.json` in `src/config/` | Update grep to also check for JSON key files: `find . -name "*serviceAccount*"` | CI fails if key file found |

---

## 4. PERFORMANCE PLAN

### Baseline Observations

| Metric | Current State | Notes |
|--------|-------------|-------|
| Build time (frontend) | ~10-15s (Vite) | Reasonable |
| Bundle split | vendor + firebase chunks | Good, but Three.js/3D libs not chunked |
| Sourcemaps | Disabled in prod build | Correct |
| Backend startup | Loads all services eagerly | Some services (queue, workers) conditionally loaded |
| Firestore queries | N+1 in `getSystemStats()` | Fetches ALL claim codes, collectibles, users |
| File upload limit | 500MB | Excessive — holds memory during upload |
| Compression | Level 6, threshold 1KB | Good defaults |
| Cache headers | Immutable for static assets | Correct |

### Proposed Optimizations

| Change | Expected Impact | Risk |
|--------|----------------|------|
| Add Three.js to `manualChunks` in Vite config | ~300KB chunk separation, faster initial load | Low |
| Paginate `getSystemStats()` queries | 10x faster admin dashboard load | Low |
| Reduce upload limit to 50MB | Prevents OOM on upload | Low |
| Add Firestore composite indexes per `firestore.indexes.json` | Faster queries for common patterns | Low |
| Lazy-load analytics + messaging modules (already done) | ✅ Already implemented | N/A |
| Remove unused frontend SendGrid dependency | ~50KB bundle reduction | None |

---

## 5. CHANGE PLAN (PHASED)

### Phase 0: Instrumentation & Tests (No production risk)
1. Document test baseline — run existing tests, record results
2. Add security regression tests for auth-protected endpoints
3. Add test for rejected content DELETE without auth
4. Add test for rejected content upload without auth
5. Verify CI secret scanning catches `serviceAccountKey.json`

### Phase 1: Critical Security Fixes 🔴
1. **S1**: Delete `serviceAccountKey.json`, rotate key in GCP IAM, scrub from git history
2. **S3**: Add `requireAdmin` to `DELETE /api/content/:contentId`
3. **S4**: Add `requireAdmin` to `POST /api/content/upload`
4. **S5**: Add `authenticateWallet` + `serialNumberLimiter` to `/api/verification/issue-token`
5. **S6**: Add `serialNumberLimiter` to `/api/verification/request-email-verification`
6. **S7/S8**: Add fail-fast boot checks for required security env vars in production

### Phase 2: Hardening & Dependency Cleanup 🟠
1. **S9**: Fix admin auth mismatch — update `requireAdmin` to also check admin session tokens
2. **S10**: Migrate admin sessions/OTP to Firestore-backed stores
3. **S11**: Restrict `.vercel.app` CORS to specific project slug
4. **S13**: Make Moralis webhook verification fail-closed
5. **S17**: Remove "simple" wallet auth fallback
6. **S14**: Add wallet signature auth to `wallet-tokens` endpoint
7. **S15**: Wire Joi validation schemas into route handlers
8. **S16/S18**: Fix upload limit and double body parsing
9. **S22**: Remove frontend SendGrid dependency
10. **S23**: Improve CI secret scanning

### Phase 3: Performance & Scalability 🟢
1. Paginate `getSystemStats()` Firestore queries
2. Add Three.js manual chunk to Vite build
3. Add health check readiness probe (verify Firestore connection)
4. Add structured request logging with trace IDs
5. Clean up expired nonces via scheduled job (already has `cleanupExpiredNonces`)

---

## 6. FINAL VERIFICATION CHECKLIST

### Local Verification Commands
```bash
# 1. Ensure no secrets in repo
git ls-files -- '**/.env' '**/serviceAccountKey*' '**/.env.local'

# 2. Run backend tests
cd crownmania_backend && npm test

# 3. Run frontend tests
cd crownmania_frontend && npm test

# 4. Lint check
cd crownmania_backend && npm run lint
cd crownmania_frontend && npm run lint

# 5. Build frontend (verify no errors)
cd crownmania_frontend && npm run build

# 6. Security endpoint checks (after fixes)
curl -X DELETE http://localhost:5001/api/content/test123  # Should → 401
curl -X POST http://localhost:5001/api/content/upload     # Should → 401
curl -X POST http://localhost:5001/api/verification/issue-token -H "Content-Type: application/json" -d '{"serialNumber":"test","walletAddress":"0x0000000000000000000000000000000000000000"}' # Should → 401
```

### Runtime Checks
- [ ] Server starts without `serviceAccountKey.json` file (uses env vars)
- [ ] Server refuses to start in production without `PII_ENCRYPTION_KEY`
- [ ] Server refuses to start in production without `SERIAL_HASH_SALT`
- [ ] Admin OTP login → admin dashboard access works end-to-end
- [ ] NFT claim flow works with nonce-based auth
- [ ] Stripe webhook signature verification passes
- [ ] Rate limiting engages on serial verification attempts

### Rollback Plan
- Each phase is independently reversible via git revert
- No database schema changes — all changes are code-only
- No API contract changes — only adding auth gates (breaking for unauthorized callers, which is intentional)
- Smart contract is NOT modified in any phase

---

## 7. THREAT MODEL (STRIDE)

| Threat Category | Scenario | Risk | Mitigated? |
|----------------|----------|------|------------|
| **Spoofing** | Attacker uses leaked SA key to impersonate backend | CRITICAL | ❌ S1 must be fixed |
| **Spoofing** | Replay wallet signature | LOW | ✅ Nonce + timestamp system |
| **Spoofing** | Forge admin session | MEDIUM | ⚠️ In-memory store (S10) |
| **Tampering** | Modify Stripe checkout price | LOW | ✅ Server-side catalog |
| **Tampering** | Delete content without auth | HIGH | ❌ S3 must be fixed |
| **Tampering** | Upload malicious content | HIGH | ❌ S4 must be fixed |
| **Repudiation** | Claim action without audit trail | LOW | ✅ Audit logs exist |
| **Info Disclosure** | Enumerate wallet tokens | MEDIUM | ⚠️ S14 — no auth on query |
| **Info Disclosure** | PII leak via profile endpoint | LOW | ✅ Encryption + masking |
| **Denial of Service** | Email bomb via `/request-email-verification` | HIGH | ❌ S6 — no rate limit |
| **Denial of Service** | 500MB upload exhausts memory | MEDIUM | ⚠️ S16 |
| **Elevation of Privilege** | Any user deletes content | HIGH | ❌ S3 |
| **Elevation of Privilege** | Non-admin accesses admin endpoints | LOW | ✅ `requireAdmin` middleware (but see S9) |
