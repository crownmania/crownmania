# CROWNMANIA — Implementation Plan

Status as of **2026-05-22**. Derived from `CROWNMANIA_PROJECT_OVERVIEW.md` and a code walkthrough.
Check off items as you complete them. Each ticket lists the **files**, **acceptance criteria**, and **owner** (you vs. ops).

Legend: 🟢 done · 🟡 in progress · 🔴 not started · ⚙️ ops/manual (not pure code)

---

## Phase 0 — Security triage (must finish before any deploy)

### S1 · Rotate Firebase service-account key 🟡 ⚙️
- **Code state:** `serviceAccountKey.json` is NOT tracked in HEAD and `.gitignore` blocks `**/serviceAccountKey*.json`. Git history scan (`git log --all -- "**/serviceAccountKey*.json"`) returned no commits.
- **Still required (manual):**
  1. In GCP Console → IAM → Service Accounts → CrownMania backend SA, **disable** the existing key.
  2. Generate a new JSON key. Save it locally only (never commit). Store the contents in Railway/Vercel as a `GOOGLE_APPLICATION_CREDENTIALS_JSON` env var (base64 if needed) — not as a file in the repo.
  3. In Firestore → Authentication → Service Accounts, audit recent activity for the disabled key.
  4. Run `git log -p --all -S "private_key" -- '*.json'` once more to confirm no stray copies in branches/tags.

### S3 · Lock down `DELETE /api/content/:contentId` 🟢
- File: `crownmania_backend/src/routes/content.js:216`
- `requireAdmin` is wired. No further action.

### S4 · Lock down `POST /api/content/upload` 🟢
- File: `crownmania_backend/src/routes/content.js:53`
- `requireAdmin` is wired. No further action.

### S5 · Lock down `POST /api/verification/issue-token` 🟢
- File: `crownmania_backend/src/routes/verification.js:198`
- `authenticateWallet` is wired. No further action.

### S6 · Rate-limit email verification by recipient 🟢
- Files: `middleware/rateLimiter.js`, `routes/verification.js:156`
- Added `emailVerificationLimiter` (3/hr per `(email, IP)` tuple) chained before `serialNumberLimiter`.
- **Verify:** `curl -X POST http://localhost:5000/api/verification/request-email-verification -H 'content-type: application/json' -d '{"serialNumber":"X","email":"a@b.c"}'` four times — fourth call returns 429.

### S7 · Fail-fast on missing/invalid `PII_ENCRYPTION_KEY` 🟢
- File: `crownmania_backend/src/services/encryptionService.js`
- In production, missing or non-hex-64 key throws at module load (server won't boot).
- Dev still falls back to deterministic key with a warning.
- **Verify:** `NODE_ENV=production node -e "import('./crownmania_backend/src/services/encryptionService.js')"` exits with the FATAL message.

### S2 · Remove SendGrid from frontend bundle 🟢
- Deleted `import sgMail from '@sendgrid/mail'` from `crownmania_frontend/src/config/emailConfig.js` (file stubbed to `export {}`).
- Removed `"@sendgrid/mail": "^7.7.0"` from `crownmania_frontend/package.json`.
- **Follow-up:** run `npm install` in `crownmania_frontend/` to refresh the lockfile, then `git diff package-lock.json` to confirm dep was dropped from the build.

### S8 · Verify CORS allowlist 🔴
- File: `crownmania_backend/src/index.js` (or wherever `cors()` is initialized).
- Confirm `origin` is a non-wildcard allowlist tied to `process.env.FRONTEND_URL` plus admin domain. Reject `*` and `null`.

### S9 · Admin OTP brute-force protection 🔴
- File: `crownmania_backend/src/services/adminService.js`, `routes/admin.js`.
- Confirm an `authLimiter` (5/hr) is on `POST /api/admin/verify-otp` and that failed OTPs increment a counter that locks the email after N misses.

### S10 · Stripe webhook signature verification 🔴
- File: `crownmania_backend/src/routes/webhooks.js`.
- Ensure `stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)` is used and that body parsing is `express.raw({ type: 'application/json' })` ONLY for that route.

### S11 · Idempotency on claim endpoint 🔴
- Files: `routes/verification.js:94` (`/claim`), `middleware/idempotency.js`.
- Add `idempotency` middleware on `POST /claim` so a network retry can't double-mint.

### S12 · Audit logging for admin actions 🔴
- Files: `routes/admin.js`, `routes/admin-enhanced.js`, `services/adminService.js`.
- Every admin mutation should write to an `admin_audit` Firestore collection with `{ adminEmail, action, target, ip, userAgent, ts }`.

### S13 · Tighten file-upload MIME validation 🔴
- File: `routes/content.js:17` (multer `fileFilter`).
- Add a server-side magic-byte sniff (e.g. `file-type` package) in addition to the `mimetype` check, since `mimetype` is client-supplied.

### S14 · Lock `GET /wallet-tokens/:walletAddress` 🟢
- File: `routes/verification.js:222`. Already wired with `authenticateWallet` + same-wallet check.

---

## Phase 1 — Testnet launch prep

### P1.1 · Fix Web3Auth ESM / Buffer polyfill 🔴
- Symptom: `Buffer is not defined` or `Cannot use import statement outside a module` in Vite dev console.
- Fix: in `crownmania_frontend/vite.config.js`, add:
  ```js
  define: { 'process.env': {}, global: 'globalThis' },
  resolve: { alias: { buffer: 'buffer/' } },
  optimizeDeps: { include: ['buffer'] },
  ```
- Install `buffer` and `process` polyfills if missing: `npm i buffer process`.

### P1.2 · Smart-contract env audit 🔴
- Files: `smart_contracts/.env.example`, `hardhat.config.js`.
- Required env: `AMOY_RPC_URL`, `DEPLOYER_PRIVATE_KEY` (a *throwaway* funded wallet, not your personal MetaMask), `POLYGONSCAN_API_KEY`, `BASE_URI`.
- Confirm `hardhat.config.js` reads from `process.env` only (no hardcoded keys).

### P1.3 · Deploy `CrownManiaNFT` to Polygon Amoy 🔴 ⚙️
1. Get Amoy testnet MATIC from the Polygon faucet for the deployer wallet.
2. `cd smart_contracts && npx hardhat run scripts/deploy.js --network amoy`
3. Copy the deployed address into:
   - `crownmania_backend/.env` → `NFT_CONTRACT_ADDRESS`
   - `crownmania_frontend/.env` → `VITE_NFT_CONTRACT_ADDRESS`
4. Verify on Polygonscan: `npx hardhat verify --network amoy <ADDRESS> <CONSTRUCTOR_ARGS>`.

### P1.4 · End-to-end testnet smoke test 🔴
- Mint 1 token from the admin panel → claim via QR flow → confirm NFT shows in MetaMask on Amoy.
- Confirm Firestore `collectibles` doc has `nftTransferred: true` and a `transactionHash`.

### P1.5 · Backend env-var checklist 🔴
Create a `RAILWAY_ENV_CHECKLIST.md` listing every var with example shape:
`FIREBASE_*`, `GOOGLE_APPLICATION_CREDENTIALS_JSON`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SENDGRID_API_KEY`, `TWILIO_*`, `SHIPSTATION_*`, `THIRDWEB_SECRET_KEY`, `NFT_CONTRACT_ADDRESS`, `AMOY_RPC_URL`, `PII_ENCRYPTION_KEY`, `JWT_SECRET`, `FRONTEND_URL`, `ADMIN_EMAILS`, `NODE_ENV=production`.

---

## Phase 2 — Production hardening

- **P2.1** Move from in-memory rate-limit store to Redis (`rate-limit-redis`) so limits survive restarts and apply across replicas.
- **P2.2** Sentry release tracking — wire `release` + `environment` to `import.meta.env.VITE_GIT_SHA` and Railway commit SHA.
- **P2.3** Replace synchronous NFT transfer with the `nftRetryService` queue everywhere (audit `verificationService.claimProduct`).
- **P2.4** Add Firestore composite indexes used by `getWalletTokens`, `getProductContent`, and admin dashboards (deploy via `firestore.indexes.json`).
- **P2.5** Frontend bundle audit: run `vite build --mode production` and check `dist/` for any leaked env vars (`grep -rE "sk_(test|live)_|SG\."`).
- **P2.6** Add `helmet` + `express-mongo-sanitize` equivalents (`xss-clean` / `express-validator`) on every POST route.
- **P2.7** Configure Cloudflare or Vercel WAF rules for `/api/admin/*` and `/api/webhooks/*`.

---

## Phase 3 — Mainnet launch

- **P3.1** Re-audit `CrownManiaNFT.sol` (Slither + manual review). Pay for external audit if budget allows.
- **P3.2** Deploy to Polygon mainnet using a hardware-wallet-signed deployer.
- **P3.3** Set up monitoring:
  - Tenderly alerts on contract events.
  - UptimeRobot/BetterStack pings on backend `/health`.
  - Sentry error budget < 0.5%.
- **P3.4** Legal: ToS + Privacy Policy live on the marketing site, accept-on-claim checkbox in the flow.
- **P3.5** Customer support runbook (refunds, lost wallet, failed mint retry).
- **P3.6** Marketing site cutover and DNS swap.

---

## How to use this file in Windsurf

1. Open the repo root in Windsurf.
2. Pin this file in the side panel.
3. For each 🔴 ticket, ask Windsurf's AI: "Implement the ticket P1.1 from IMPLEMENTATION_PLAN.md" — the file paths and acceptance criteria are already inline.
4. After each ticket, change 🔴 → 🟢 and commit with a message like `feat(security): S11 idempotency on /claim`.
