# 🏆 CROWNMANIA — Comprehensive Project Overview
**Last Updated:** February 17, 2026  
**Author:** Anti-Gravity (compiled from 20+ conversation sessions)

---

## TABLE OF CONTENTS

1. [What Is CrownMania](#1-what-is-crownmania)
2. [System Architecture](#2-system-architecture)
3. [Current Status — What's DONE ✅](#3-current-status--whats-done-)
4. [Current Status — What's IN PROGRESS 🔄](#4-current-status--whats-in-progress-)
5. [Current Status — What's NOT STARTED ❌](#5-current-status--whats-not-started-)
6. [Domain-by-Domain Breakdown](#6-domain-by-domain-breakdown)
7. [Security Posture & Critical Fixes](#7-security-posture--critical-fixes)
8. [Test Suite Status](#8-test-suite-status)
9. [Deployment Infrastructure](#9-deployment-infrastructure)
10. [Prioritized Action Plan](#10-prioritized-action-plan)
11. [Environment Variables Master List](#11-environment-variables-master-list)
12. [File Structure Reference](#12-file-structure-reference)

---

## 1. WHAT IS CROWNMANIA

CrownMania is a **phygital collectibles platform** that bridges physical products with digital NFT ownership. Users purchase physical collectibles (starting with Lil Durk "Series 01"), each containing a QR code with a unique serial number. Scanning the QR code triggers a **verification → wallet connection → NFT claim → vault access** flow.

### Core Value Proposition
- **Physical Product** → QR Code → Serial Number → Verification → NFT Claim → Digital Ownership
- **500 limited editions** per collectible (ERC-721 on Polygon)
- **Vault Experience** — owners unlock exclusive content, 3D model viewers, digital collectible details
- **Exclusive content drops** — gated behind ownership + optional edition ranges

### Product: Lil Durk Series 01 "Free The Voice"
- 500 editions
- Physical figure with embedded QR code
- Digital NFT (ERC-721 on Polygon blockchain)
- Exclusive content access via the Vault

---

## 2. SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                         USERS / CLIENTS                       │
│   Browser (React SPA) / QR Scanner / Mobile                   │
└──────────────┬──────────────────────┬─────────────────────────┘
               │     HTTPS            │
┌──────────────▼──────────┐  ┌────────▼──────────────────┐
│   FRONTEND (Vite/React) │  │  Firebase Hosting          │
│   Vercel (production)   │  │  Static dist2/ folder      │
│   Port 5174 (dev)       │  │  CSP + Security headers    │
└──────────────┬──────────┘  └───────────────────────────┘
               │  /api/* → Railway backend
┌──────────────▼────────────────────────────────────────────┐
│   BACKEND (Express.js / Node 18 ESM)                       │
│   Railway (production) / localhost:5001 (dev)               │
│                                                            │
│   ┌─── Middleware ──────────────────────────────────┐      │
│   │ helmet, cors, compression, rate-limit, auth     │      │
│   └─────────────────────────────────────────────────┘      │
│                                                            │
│   ┌─── Routes (13 files) ──────────────────────────┐      │
│   │ verification, auth, wallet, content, admin,     │      │
│   │ admin-enhanced, stripe, webhooks, profile,       │      │
│   │ notificationPreferences, firebase,               │      │
│   │ collectibleRoutes, orderRoutes                   │      │
│   └──────────────────────────────────────────────────┘     │
│                                                            │
│   ┌─── Services (15 files) ────────────────────────┐      │
│   │ verification, signature, admin, encryption,     │      │
│   │ orderFulfillment, thirdweb, queue, email,        │      │
│   │ sms, twoFactor, notification, ownership,         │      │
│   │ nftRetry, content, dataValidation                │      │
│   └──────────────────────────────────────────────────┘     │
└────────────┬───────────────┬──────────────┬────────────────┘
             │               │              │
    ┌────────▼────────┐ ┌────▼─────┐ ┌──────▼──────────┐
    │ Firestore        │ │ Stripe   │ │ Polygon (ERC721)│
    │ (crownmania DB)  │ │ Payments │ │ via Thirdweb    │
    └─────────────────┘ └──────────┘ └─────────────────┘
    
    ┌──────────────┐ ┌──────────┐ ┌───────────┐ ┌───────┐
    │ SendGrid     │ │ Twilio   │ │ Moralis   │ │ Redis │
    │ (Email)      │ │ (SMS)    │ │ (Webhooks)│ │ (Opt) │
    └──────────────┘ └──────────┘ └───────────┘ └───────┘
```

### Key Technology Stack
| Component | Technology | Status |
|-----------|-----------|--------|
| Frontend | React 18 + Vite + Styled Components | ✅ Active |
| 3D Rendering | Three.js + @react-three/fiber + drei | ✅ Active |
| Backend | Express.js (Node 18 ESM) | ✅ Active |
| Database | Firestore (named DB: "crownmania") | ✅ Active |
| Blockchain | Polygon (ERC-721) | ⚠️ Contract not yet deployed |
| NFT SDK | Thirdweb SDK v4 | ✅ Installed |
| Wallet Auth | Web3Auth (embedded wallets) | ⚠️ Config issues encountered |
| Payments | Stripe | ✅ Integrated |
| Email | SendGrid | ✅ Integrated |
| SMS | Twilio | ✅ Code written |
| Webhooks | Moralis Streams | ✅ Code written |
| Queue | BullMQ + Redis | ✅ Code written |
| Smart Contract | Solidity (Hardhat) | ✅ Compiled, tests passing |
| CI/CD | GitHub Actions | ✅ Configured |
| Frontend Hosting | Vercel + Firebase Hosting | ✅ Configured |
| Backend Hosting | Railway | ✅ Configured |

---

## 3. CURRENT STATUS — WHAT'S DONE ✅

### Frontend
- [x] **Landing page** — animated title with glow effect, halftone separator, brand flow
- [x] **Password gate** — site password protection (`cm1997`)
- [x] **Header/Navigation** — drawer menu, wallet connect button, active section highlighting
- [x] **Vault section (massive — 134KB)** — full UI/UX with:
  - Character grid (Lil Durk active, others "Coming Soon")
  - ID card gallery with front/back image carousel
  - 3D model viewer (Three.js canvas with OrbitControls)
  - Digital collectible details panel
  - Verify & Authenticate panel (serial input + QR scanner)
  - Vault Connection panel (Web3Auth wallet connect)
  - Dynamic theme colors per character (blue for Durk)
  - Social media links (Twitter, Instagram, YouTube, TikTok)
  - Blueprint SVG background
  - Responsive across mobile/tablet/desktop
- [x] **QR Scanner** — HTML5 QR code scanning with camera access
- [x] **Verify page** — serial number verification flow
- [x] **Mint NFT page** — wallet connection + claim flow
- [x] **Shop component** — product showcase
- [x] **Legal pages** — Terms, Privacy Policy, Returns Policy (all sales final)
- [x] **Footer, About, Contact** — standard sections
- [x] **Background effects** — BackgroundBeams, BlockchainMatrix, CobeGlobe
- [x] **Content viewer** — for exclusive content display
- [x] **SEO** — meta tags, structured headings
- [x] **CSP headers** — configured in both vercel.json and firebase.json

### Backend  
- [x] **Verification API** — verify serial numbers, claim products
- [x] **Auth API** — nonce generation, signature verification, 2FA routes
- [x] **Wallet API** — connect, collectibles query, transfer
- [x] **Content API** — upload, access control, signed URLs
- [x] **Admin API** — OTP login, CRUD, stats
- [x] **Profile API** — PII encryption, age gate, optional birthday
- [x] **Stripe integration** — checkout sessions, webhooks
- [x] **Email service** — claim confirmations, order receipts
- [x] **SMS service** — Twilio 2FA codes
- [x] **2FA service** — phone + email verification
- [x] **Order fulfillment** — Stripe → serial allocation
- [x] **Queue service** — BullMQ job management
- [x] **Transfer worker** — NFT transfer execution
- [x] **Ownership service** — on-chain verification
- [x] **NFT retry service** — exponential backoff retries
- [x] **Encryption service** — AES-256-GCM for PII
- [x] **Signature service** — ethers.js nonce + signature
- [x] **Notification service** — immediate email/SMS/in-app
- [x] **Data validation service** — integrity checks
- [x] **Rate limiting** — per-endpoint, per-IP
- [x] **Security middleware** — helmet, CORS, compression
- [x] **Idempotency middleware** — duplicate request prevention

### Smart Contract
- [x] **CrownManiaNFT.sol** — ERC-721, 500 editions, pre-mint + transfer
- [x] **Deployment script** — Polygon Amoy testnet (Mumbai deprecated)
- [x] **Hardhat config** — Polygon networks configured
- [x] **Unit tests** — 17/17 passing
- [x] **E2E claim flow tests** — 16/16 passing

### Infrastructure
- [x] **CI/CD pipeline** — GitHub Actions (backend tests, frontend build, security checks)
- [x] **Vercel config** — vercel.json with CSP, rewrites, caching
- [x] **Firebase config** — firebase.json with CSP, caching
- [x] **Railway config** — railway.json for backend deployment
- [x] **Security audit** — 23 findings documented (CRITICAL: 3, HIGH: 7, MEDIUM: 8, LOW: 5)

---

## 4. CURRENT STATUS — WHAT'S IN PROGRESS 🔄

| Item | Status | Notes |
|------|--------|-------|
| **Web3Auth integration** | 🔄 Partial | Client ID configured, but CommonJS/ESM compatibility issues encountered. polyfills added but flow not fully tested end-to-end |
| **Auth Provider Abstraction** | 🔄 Designed | Web3AuthProvider + MoonPayAuthProvider adapters created, factory with env var switching implemented, but not fully tested |
| **MoonPay integration** | 🔄 Planned | Comprehensive swap-out plan created, risk register designed, rollback procedures defined — zero code integration started |
| **Backend test suite** | 🔄 Mostly done | Jest ESM compatibility resolved. 141+ tests written. Some may need re-verification after recent changes |
| **Vault UI polish** | 🔄 Ongoing | ID card gap fixed, QR button redesigned, responsive breakpoints added. Title glow intensified. More polish always possible |

---

## 5. CURRENT STATUS — WHAT'S NOT STARTED ❌

| Item | Priority | Notes |
|------|----------|-------|
| **Smart contract deployment to testnet** | 🔴 HIGH | Contract compiled + tested but NOT deployed. Need deployer wallet + Alchemy key + test MATIC |
| **End-to-end claim flow on testnet** | 🔴 HIGH | Cannot test until contract deployed |
| **Security fixes from audit** | 🔴 CRITICAL | 3 critical + 7 high findings unresolved (see Section 7) |
| **Firebase SA key rotation** | 🔴 CRITICAL | `serviceAccountKey.json` committed to repo — needs immediate rotation |
| **Content endpoint auth** | 🔴 CRITICAL | DELETE and POST endpoints have NO authentication |
| **Production deployment** | 🟠 HIGH | Vercel + Railway configs exist but production env vars not fully configured |
| **Admin panel UI** | 🟠 HIGH | Backend admin routes exist but no frontend admin panel built |
| **Reconciliation worker** | 🟡 MEDIUM | Designed but not scheduled (DB ↔ blockchain sync) |
| **PostgreSQL migration** | 🟡 MEDIUM | Planned for Phase 2 (Firestore → Supabase) |
| **Exclusive content admin tools** | 🟡 MEDIUM | Backend content service exists, but no admin UI for creating drops |
| **Email templates** | 🟡 MEDIUM | Inline HTML templates — could be more polished |
| **Real Stripe integration** | 🟡 MEDIUM | Keys configured but publishable key empty in frontend .env |
| **reCAPTCHA** | 🟢 LOW | Keys not configured |
| **ShipStation** | 🟢 LOW | Keys not configured |

---

## 6. DOMAIN-BY-DOMAIN BREAKDOWN

### 6A. Frontend UI/UX
**Owner:** Actively developed  
**Key File:** `Vault.jsx` (134KB — the largest component)

**Recently Completed:**
- ID card gallery gap eliminated (image fills edge-to-edge)
- QR button redesigned to 100×100 square with QR watermark
- IDCard responsive breakpoints (500px mobile, 600px tablet)
- Landing title glow intensified (doubled shadow opacity + 80px halo)
- PanelTitle flex layout fixed (SVG icons no longer stretch)
- Vault Connection title/icon fixed

**Known Issues:**
- `Vault.jsx` is 134KB / 3,634 lines — should be split into subcomponents for maintainability
- Authentication flow in browser sometimes shows "AUTHENTICATION FAILED" with code "cm1997" (likely a site password vs Vault auth confusion)
- Some animations/transitions may be performance-heavy on mobile

### 6B. NFT Claiming Flow
**Owner:** Backend + Frontend  
**Status:** Code complete, NOT tested end-to-end

**Flow:**
```
QR Scan → /verify?code=ABC123 → POST /api/verification/verify
  → Checks Firestore claimCodes → Returns {verified, product}
  → User clicks "Claim" → Web3Auth login
  → GET /api/auth/nonce?address=0x...
  → User signs message in wallet
  → POST /api/verification/claim
    → Verify signature (ecrecover)
    → Verify nonce not expired
    → Firestore transaction:
        - Mark claimCode as claimed
        - Increment edition counter (atomic)
        - Create collectible record
    → Enqueue NFT transfer job (BullMQ)
  → Transfer Worker processes job
    → contract.transferEdition(userWallet, tokenId)
    → Wait for on-chain confirmation
    → Update collectible status → 'active'
    → Send claim confirmation email
  → User sees NFT in Vault
```

**Blockers:**
1. Smart contract not deployed to any network
2. Web3Auth integration has unresolved ESM/CommonJS issues
3. Transfer worker untested with real blockchain

### 6C. Payments & Orders
**Owner:** Backend  
**Status:** Code written, Stripe keys partially configured

**Components:**
- `stripe.js` — checkout sessions, webhook handler
- `orderFulfillmentService.js` — Stripe → serial allocation → order creation
- `orderRoutes.js` — order CRUD

**Blockers:**
- Frontend `VITE_STRIPE_PUBLISHABLE_KEY` is empty
- Stripe webhook endpoint needs deployment verification
- No shipping integration yet (ShipStation keys empty)

### 6D. Security & Auth
**Owner:** Backend  
**Status:** Multiple critical vulnerabilities identified, NOT fixed

**Implemented:**
- Nonce-based signature verification (ethers.js)
- PII encryption (AES-256-GCM)
- Rate limiting per endpoint
- Helmet + CORS + Compression
- CSP headers on both Vercel and Firebase

**Critical Gaps (from Security Audit):**
| # | Severity | Issue | Status |
|---|----------|-------|--------|
| S1 | 🔴 CRITICAL | Firebase SA key committed to repo | ❌ NOT FIXED |
| S3 | 🔴 CRITICAL | Content DELETE has NO auth | ❌ NOT FIXED |
| S4 | 🟠 HIGH | Content upload has NO auth | ❌ NOT FIXED |
| S5 | 🟠 HIGH | `/issue-token` has NO auth | ❌ NOT FIXED |
| S6 | 🟠 HIGH | `/request-email-verification` no rate limit | ❌ NOT FIXED |
| S7 | 🟠 HIGH | Hardcoded fallback secrets | ❌ NOT FIXED |
| S8 | 🟠 HIGH | Random PII key on restart | ❌ NOT FIXED |
| S9 | 🟠 HIGH | Admin auth mismatch (Firebase vs custom JWT) | ❌ NOT FIXED |
| S10 | 🟠 HIGH | In-memory stores lost on restart | ❌ NOT FIXED |
| S17 | 🟡 MEDIUM | "Simple" wallet auth accepts any crownmania message | ❌ NOT FIXED |

### 6E. Email & Notifications
**Owner:** Backend  
**Status:** Code written, SendGrid key configured in backend

**Components:**
- `emailService.js` — claim confirmations, order receipts, admin alerts
- `smsService.js` — Twilio 2FA codes
- `notificationService.js` — immediate email/SMS/in-app dispatch
- `notificationPreferences.js` — user preference routes

**Notes:**
- Frontend has `@sendgrid/mail` as dependency (should be removed — emails sent from backend only)
- Email templates are inline HTML (functional but not polished)
- SMS/Twilio not tested with real credentials

### 6F. Firestore Data Layer
**Owner:** Backend  
**Status:** Core collections defined, security rules incomplete

**Collections:**
- `claimCodes` — serial numbers + claim status
- `collectibles` — owned NFTs + edition numbers
- `users` — profiles with encrypted PII
- `products` — product catalog
- `content` — exclusive content metadata
- `nonces` — auth nonce tracking
- `auditLogs` — event audit trail
- `transferJobs` — NFT transfer job tracking

**Gaps:**
- Firestore security rules not deployed for `claimCodes`, `counters`, `products`, `content`
- No composite indexes defined in `firestore.indexes.json`

### 6G. Returns & Refund Policy
**Owner:** Legal pages  
**Status:** ✅ COMPLETE

- All sales final
- 5-day window for replacements only (manufacturing defects / shipping damage)
- No support after 5-day window for customer-induced damage
- NFT claiming is irreversible

---

## 7. SECURITY POSTURE & CRITICAL FIXES

### 🔴 IMMEDIATE (Do Before Any Public Launch)

1. **Rotate Firebase SA key** — The `serviceAccountKey.json` was committed to the repo. Even though it may be removed from HEAD now, the key is in git history and must be rotated in GCP IAM immediately.

2. **Add auth to content endpoints**:
   ```javascript
   // content.js — Add requireAdmin middleware
   router.delete('/:contentId', requireAdmin, async (req, res) => {...})
   router.post('/upload', requireAdmin, upload.single('file'), async (req, res) => {...})
   ```

3. **Add auth to `/api/verification/issue-token`** — currently unauthenticated

4. **Add rate limiting to `/api/verification/request-email-verification`** — email bombing vector

5. **Remove hardcoded fallback secrets** — fail-fast if env vars not set in production

### 🟠 BEFORE SCALING (Phase 2)

6. Fix admin auth mismatch (S9) — `requireAdmin` checks Firebase tokens but admin login generates custom JWT
7. Migrate in-memory stores to Firestore/Redis (S10)
8. Restrict CORS `.vercel.app` wildcard to specific project slug (S11)
9. Make Moralis webhook verification fail-closed (S13)
10. Remove "simple" wallet auth fallback (S17)
11. Wire Joi validation schemas into route handlers (S15)

---

## 8. TEST SUITE STATUS

### Backend Tests

| Category | Count | Status |
|----------|-------|--------|
| **Unit Tests** | | |
| smsService.test.js | ~8 tests | ✅ Written |
| twoFactorService.test.js | ~10 tests | ✅ Written |
| emailService.test.js | ~8 tests | ✅ Written |
| orderFulfillmentService.test.js | ~8 tests | ✅ Written |
| rateLimiter.test.js | ~5 tests | ✅ Written |
| Inventory.test.js | ~6 tests | ✅ Written |
| **Integration Tests** | | |
| maxEdition.test.js | ~10 tests | ✅ Written |
| duplicateClaim.test.js | ~8 tests | ✅ Written |
| nftClaiming.test.js | ~6 tests | ✅ Written |
| walletTransfer.test.js | ~12 tests | ✅ Written |
| webhooks.test.js | ~8 tests | ✅ Written |
| auth2fa.test.js | ~6 tests | ✅ Written |
| contentRoutes.test.js | ~8 tests | ✅ Written |
| adminRoutes.test.js | ~10 tests | ✅ Written |
| reconciliation.test.js | ~6 tests | ✅ Written |
| rateLimiter.integration.test.js | ~4 tests | ✅ Written |
| logger.integration.test.js | ~3 tests | ✅ Written |

**Total:** ~141+ tests written  
**Last known state:** All tests passing (ESM compatibility resolved in conversation `d94157e1`)  
**Note:** Tests use Jest with `--experimental-vm-modules` for ESM support

### Smart Contract Tests
| Test File | Count | Status |
|-----------|-------|--------|
| CrownManiaNFT.test.js | 17 tests | ✅ All passing |

### Frontend Tests
- Minimal — vitest configured but few test files exist
- Component tests should be added for Vault, QR Scanner, VerifyPage, MintNFTPage

---

## 9. DEPLOYMENT INFRASTRUCTURE

### Current Setup

| Platform | Purpose | Config File | Status |
|----------|---------|------------|--------|
| **Vercel** | Frontend hosting (production) | `vercel.json` | ✅ Configured |
| **Firebase Hosting** | Frontend hosting (backup) | `firebase.json` | ✅ Configured |
| **Railway** | Backend API (production) | `railway.json` | ✅ Configured |
| **GitHub Actions** | CI/CD | `.github/workflows/ci.yml` | ✅ Configured |

### Production URLs
- **Frontend (Vercel):** Connected via GitHub auto-deploy
- **Backend (Railway):** `https://crownmania-backend-production.up.railway.app`
- **Firebase Hosting:** `https://sonorous-crane-440603-s6.web.app`

### GitHub Actions Workflow
- **Backend job:** Install → Lint → Unit tests → Integration tests → Secret scanning
- **Frontend job:** Install → Build (with placeholder env vars) → Lint
- **Security job:** Check .env files → Check .gitignore → Dependency audit → Hardcoded credentials scan

### Missing for Production Deployment
1. Set Railway env vars for Thirdweb:
   - `THIRDWEB_NFT_CONTRACT` - Contract address
   - `THIRDWEB_SECRET_KEY` - API secret
   - `NFT_OWNER_WALLET` - Backend wallet address
   - `MINTING_WALLET_PRIVATE_KEY` - Wallet private key
2. Set Vercel env vars:
   - `VITE_STRIPE_PUBLISHABLE_KEY`
   - `VITE_API_URL` (production Railway URL)
3. Deploy smart contract to Polygon Amoy testnet
4. Configure Moralis webhook to point to Railway backend
5. Set up SendGrid sender verification
6. Configure Twilio phone number

---

## 10. PRIORITIZED ACTION PLAN

### 🔴 Phase 0: Security Triage (BEFORE ANY PUBLIC ACCESS)
*Estimated: 1-2 days*

| # | Task | Effort |
|---|------|--------|
| 1 | Rotate Firebase SA key in GCP IAM | 30 min |
| 2 | Delete `serviceAccountKey.json` from repo + git history | 1 hr |
| 3 | Add `requireAdmin` to content DELETE + POST endpoints | 30 min |
| 4 | Add auth to `/api/verification/issue-token` | 30 min |
| 5 | Add rate limit to `/request-email-verification` | 15 min |
| 6 | Remove hardcoded secret fallbacks (fail-fast in prod) | 30 min |
| 7 | Remove `@sendgrid/mail` from frontend package.json | 5 min |

### 🟠 Phase 1: Testnet Launch (Core Functionality)
*Estimated: 3-5 days*

| # | Task | Effort |
|---|------|--------|
| 1 | Create deployer wallet (fresh, NOT personal) | 15 min |
| 2 | Get Alchemy API key (Polygon Amoy) | 15 min |
| 3 | Get test MATIC from faucet | 15 min |
| 4 | Deploy CrownManiaNFT contract to Polygon Amoy | 1 hr |
| 5 | Update backend .env with contract address | 15 min |
| 6 | Fix Web3Auth ESM/polyfill issues | 2-4 hr |
| 7 | Test full QR → verify → claim → NFT transfer flow locally | 4 hr |
| 8 | Configure Railway production env vars | 1 hr |
| 9 | Configure Vercel production env vars | 30 min |
| 10 | Deploy frontend + backend to production | 1 hr |
| 11 | Test production claim flow end-to-end | 2 hr |

### 🟡 Phase 2: Hardening & Polish
*Estimated: 5-7 days*

| # | Task | Effort |
|---|------|--------|
| 1 | Fix admin auth mismatch (S9) | 2 hr |
| 2 | Migrate in-memory stores to Firestore (S10) | 4 hr |
| 3 | Restrict CORS to specific Vercel project (S11) | 30 min |
| 4 | Wire Joi validation schemas to all routes (S15) | 3 hr |
| 5 | Build admin panel frontend (content drops, stats, retry queue) | 2-3 days |
| 6 | Configure Moralis webhook for transfer tracking | 2 hr |
| 7 | Set up reconciliation worker (daily DB↔chain sync) | 2 hr |
| 8 | Polish email templates | 4 hr |
| 9 | Stripe production keys + test checkout flow | 2 hr |
| 10 | Refactor `Vault.jsx` into smaller subcomponents | 1 day |

### 🟢 Phase 3: Scale & Enrich
*Estimated: 2+ weeks*

| # | Task | Effort |
|---|------|--------|
| 1 | MoonPay integration (auth provider swap-out) | 1 week |
| 2 | PostgreSQL migration (Firestore → Supabase) | 1 week |
| 3 | ShipStation integration for physical shipping | 2-3 days |
| 4 | reCAPTCHA integration for verification page | 1 day |
| 5 | Add more collectible characters (Moneybag Yo, Miss Mulatto) | 2-3 days each |
| 6 | Frontend test suite (component tests) | 2-3 days |
| 7 | Performance optimization (Three.js chunking, lazy loading) | 1-2 days |
| 8 | Polygon mainnet deployment (from Amoy testnet) | 1 day |

---

## 11. ENVIRONMENT VARIABLES MASTER LIST

### Backend (`crownmania_backend/.env`)
```bash
# Firebase
FIREBASE_PRIVATE_KEY_ID=
FIREBASE_PRIVATE_KEY=""
FIREBASE_CLIENT_EMAIL=
FIREBASE_CLIENT_ID=
FIREBASE_CLIENT_CERT_URL=
FIREBASE_STORAGE_BUCKET=
FIREBASE_DATABASE_URL=

# Server
PORT=5001
NODE_ENV=development
FRONTEND_URL=http://localhost:5174

# Blockchain
POLYGON_CHAIN_ID=80002  # Amoy testnet (137 for mainnet)
ALCHEMY_POLYGON_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_KEY

# NFT
THIRDWEB_NFT_CONTRACT=0x...  # After deployment
THIRDWEB_SECRET_KEY=
NFT_OWNER_WALLET=0x...  # Deployer wallet address
MINTING_WALLET_PRIVATE_KEY=  # Private key for transfer

# Payments
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Email
SENDGRID_API_KEY=

# SMS
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Security
PII_ENCRYPTION_KEY=  # 32-byte hex (REQUIRED — no fallback!)
SERIAL_HASH_SALT=  # (REQUIRED — no fallback!)
CONTENT_ACCESS_SECRET=  # (REQUIRED — no fallback!)
MORALIS_WEBHOOK_SECRET=  # For Moralis webhook verification

# Admin
ADMIN_OTP_SECRET=
SITE_PASSWORD=cm1997

# Queue (optional)
REDIS_URL=  # For BullMQ (in-memory fallback if not set)
```

### Frontend (`crownmania_frontend/.env`)
```bash
# Firebase
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=

# API
VITE_API_URL=http://localhost:5001  # Production: Railway URL

# Web3
VITE_WEB3AUTH_CLIENT_ID=
VITE_WEB3_RPC_TARGET=
VITE_MORALIS_API_KEY=

# Payments
VITE_STRIPE_PUBLISHABLE_KEY=  # ← EMPTY, needs to be set for production

# Site
VITE_SITE_PASSWORD=cm1997
```

---

## 12. FILE STRUCTURE REFERENCE

```
crownmania_main/
├── .github/workflows/
│   ├── ci.yml                          # Backend tests + Frontend build + Security checks
│   └── firebase-hosting-pull-request.yml
├── crownmania_backend/
│   ├── src/
│   │   ├── config/             (6 files) — blockchain, firebase, etc.
│   │   ├── controllers/        (3 files) — business logic
│   │   ├── middleware/          (7 files) — auth, validation, rate-limit, idempotency
│   │   ├── models/             (4 files) — data models  
│   │   ├── routes/             (13 files) — API endpoints
│   │   ├── services/           (15 files) — core business services
│   │   ├── workers/            (1 file) — transfer worker
│   │   └── server.js           — Express app entry point
│   └── tests/
│       ├── unit/               (6 test files)
│       ├── integration/        (11 test files)
│       ├── controllers/        (1 test file)
│       ├── middleware/         (1 test file)
│       ├── security/          (1 test file)
│       └── firestore/         (1 test file)
├── crownmania_frontend/
│   ├── src/
│   │   ├── components/        (24 files + 5 subdirs) — React components
│   │   │   ├── Vault.jsx      (134KB — THE monster component)
│   │   │   ├── QRScanner.jsx  (22KB)
│   │   │   ├── Header.jsx     (13KB)
│   │   │   └── ...
│   │   ├── pages/             (7 files) — VerifyPage, MintNFTPage, LegalPage, etc.
│   │   ├── hooks/             (3 files) — useWeb3Auth, etc.
│   │   ├── services/          (1 file) — api.js
│   │   ├── config/            (4 files) — firebase, web3auth, etc.
│   │   └── utils/             (5 files) — helpers
│   ├── vercel.json            — Vercel deployment config with CSP
│   └── package.json
├── smart-contracts/
│   ├── contracts/CrownManiaNFT.sol     — ERC-721 contract
│   ├── scripts/deploy.js               — Deployment + pre-mint
│   ├── test/                           — Hardhat tests (17 passing)
│   └── hardhat.config.js              — Polygon network config
├── SECURITY_AUDIT_REPORT.md            — 23 findings, phased fix plan
├── DEPLOYMENT_GUIDE.md                 — Step-by-step deployment
├── firebase.json                       — Firebase Hosting config
├── railway.json                        — Railway backend config
└── package.json                        — Root monorepo scripts
```

---

## SUMMARY

**CrownMania is architecturally complete but not production-ready.** The code for every major system exists (verification, claiming, NFT transfer, payments, email, SMS, 2FA, admin, content gating), but several critical gaps prevent a safe public launch:

1. **Smart contract not deployed** — the entire NFT transfer flow is untestable
2. **3 critical security vulnerabilities** — SA key in repo, unauthenticated destructive endpoints
3. **Web3Auth integration issues** — wallet connection not fully tested end-to-end
4. **Missing production env vars** — Stripe, ShipStation, reCAPTCHA keys empty

**Recommended immediate next step:** Execute Phase 0 (security triage — ~1 day) then Phase 1 (testnet launch — ~3 days) to get a working end-to-end claim flow on Polygon Amoy testnet.
