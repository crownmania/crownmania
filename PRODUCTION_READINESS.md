# Crownmania Production Readiness Checklist

Status verified against live production on 2026-09-13. `[x]` means confirmed
working by direct inspection, not assumed. Items marked **UNVERIFIED** need a
console check nobody has done yet.

The store is live and has taken real orders. What follows is what is actually
configured, plus what is genuinely still missing.

## Things That Still Need To Be Fixed

Consolidated backlog as of 2026-09-23. Ordered roughly by priority.

### Needs a live test / verification

- [ ] **Live claim test for the thirdweb v5 mint path** — `thirdwebService.js`
      was migrated off deprecated `@thirdweb-dev/sdk` v4 to `thirdweb` v5.
      Backend tests mock the service, so only a real claim proves the new
      `claimTo` + `sendTransaction` path on-chain. The ethers.js fallback is
      intact and covers failures, but confirm the primary path with one real
      claim (or Amoy testnet) before relying on it at volume.
- [ ] Scheduled Firestore backups enabled (Firebase Console → Firestore → Backups)
- [ ] End-to-end claim → perk unlock on prod (`/vault` serial → NFT → exclusive
      content) — the signing bug is fixed in code but not yet exercised live
- [ ] Refund flow → confirm serials release back to inventory
- [ ] Fulfillment failure path → dead-letter queue + admin alert
- [ ] Mark-shipped flow → tracking email arrives and link works

### Operations / config (not code)

- [ ] `git push` — 11+ local commits not yet on GitHub; CI has never run on them
- [ ] Set `SENTRY_DSN` (backend) + `VITE_SENTRY_DSN` (frontend) to activate monitoring
- [ ] Add `RAILWAY_TOKEN` + `FIREBASE_SERVICE_ACCOUNT` repo secrets to enable
      `.github/workflows/deploy.yml`; flip its trigger to `push: [main]` for auto-deploy
- [ ] Stripe Dashboard: business type Individual → Company (LLC name + EIN) so
      checkout stops showing the owner's personal name; legal pages should name
      the LLC too
- [ ] Webhook URL still points at `*.up.railway.app` instead of `api.crownmania.com`
- [ ] Uptime monitor pinging `/health` + downtime alerting
- [ ] DMARC `p=none` → `p=quarantine` once Resend traffic looks clean
- [ ] Confirm Resend domain shows **Verified** in dashboard
- [ ] Remove unused `SENDGRID_API_KEY` from Railway vars
- [ ] Twilio SMS path is configured-but-unused — `smsService` no-ops without
      creds; decide whether to keep or strip

### Code health (low priority, non-breaking)

- [ ] ~37 `logger.error('msg:', err.message)` call sites use winston splat —
      error messages get swallowed into metadata. Interpolate into the string.
- [ ] ~90 frontend / ~92 backend `npm audit` findings remain — all deep
      transitive deps requiring risky major bumps (firebase-tools, hardhat-era
      packages). At the practical floor without a dedicated upgrade project.
- [ ] `ANALYTICS_SALT` has a hardcoded fallback — weak IP hashing if unset in prod
- [ ] In-memory stores besides rate limits (claim nonces, profile sessions)
      still reset on deploy and won't share across multiple Railway instances
- [ ] Backend `console.log`/`console.error` in a few files → move to winston logger
- [ ] Frontend bundle ~4.2 MB main chunk — code-split three.js/Vault for load time
- [ ] `sendVerificationEmail` + `POST /api/verification/request-email-verification`
      are dead code (no frontend caller) — remove or wire
- [ ] Product catalog is hardcoded in `stripe.js` — new figure = redeploy;
      consider Firestore-backed catalog if the line grows
- [ ] ethers v5-style calls in backend worker while frontend uses v6 — two API
      generations to maintain; consolidate on v6 in a dedicated pass
- [ ] No staging environment — every change goes to the live store (cheap fix:
      second Railway service + Firebase preview channel on a `staging` branch)

## Deploy Runbook (read this first)

**Backend — `railway up` must be run from the repo root**, not from
`crownmania_backend/`. The Railway service builds from the repo root (see
`railway.json`: `watchPatterns: crownmania_backend/**` and
`startCommand: cd crownmania_backend && npm install && node src/server.js`).
Running it from inside the backend folder fails with
`Failed to read app source directory` — and Railway keeps serving the previous
image, so **a failed deploy looks like a successful one**. Production once ran a
16-day-old image this way while changes appeared to be "deployed".

```bash
cd /path/to/crownmania        # repo root, NOT crownmania_backend
railway up
railway status                # must read "● Online", NOT "● Online · Deploy failed"
```

Always confirm afterwards:
- `railway status` shows `● Online` with a **new** deployment ID
- `curl https://api.crownmania.com/health` shows a low `uptime`

Note `railway redeploy` only re-runs the **last good image** with current env
vars. It is not a way to ship new code, and its uptime reset can be mistaken
for a successful deploy.

**Frontend** deploys separately to Firebase Hosting (`firebase deploy --only hosting`).
Pushing to `main` does **not** deploy it — the only Firebase workflow in
`.github/workflows/` is a pull-request preview.

**Environment variables** live on the Railway *service*, so they persist across
deployments. A new deployment ID never means lost secrets.

## Environment Variables

### Stripe
- [x] `STRIPE_SECRET_KEY` — live key (`sk_live_...`)
- [x] `STRIPE_WEBHOOK_SECRET` — set
- [x] `FRONTEND_URL` — `https://crownmania.com`

  This must be the **custom domain**, not the raw Firebase domain. It feeds the
  Stripe `success_url`/`cancel_url` and the Vault links in emails. It was
  previously the `.web.app` domain, which bounced paying customers to a
  different origin mid-checkout and lost their session state.

### Firebase
- [x] `FIREBASE_STORAGE_BUCKET` — set
- [x] Service account key deployed — `/health` reports `firebase: connected`
- [x] Firestore security rules deployed — deny-all rules confirmed live on the
      named `crownmania` database (`firebase deploy --only firestore:rules`
      reported already up-to-date on 2026-09-23)
- [ ] **UNVERIFIED** Scheduled Firestore backups enabled (Firebase Console → Firestore → Backups)

### Email — Resend (NOT SendGrid)
Mail is sent via **Resend**. `sgMail` in `src/config/email.js` is a
compatibility shim that keeps the old SendGrid call signature, which is why the
variable names still look SendGrid-flavoured.

- [x] `RESEND_API_KEY` — set, and confirmed sending
- [x] `SENDGRID_FROM_EMAIL` — `noreply@crownmania.com` (legacy name; used as the Resend "from")
- [x] `ADMIN_ALERT_EMAIL` — `crown@crownmania.com`
- [x] Resend domain DNS for `crownmania.com` is published:
      - `resend._domainkey.crownmania.com` — DKIM public key present
      - `send.crownmania.com` — Resend SPF (`v=spf1 ip4:52.3.252.119 ...`) and
        MX `feedback.forge.rmta.net`
      Resend signs as the `send.` subdomain, so the root SPF correctly stays
      Google Workspace only (`include:_spf.google.com ~all`) — no Resend
      include is needed at the apex.
- [ ] Confirm the domain reads **Verified** in the Resend dashboard. The
      production `RESEND_API_KEY` is send-only (`restricted_api_key`), so this
      cannot be checked via the API.
- [ ] DMARC is `p=none` (monitor only, reports to crown@crownmania.com).
      Consider moving to `p=quarantine` once Resend traffic looks clean.
- [ ] `SENDGRID_API_KEY` is set but unused and can be removed.

### Security
- [x] `SERIAL_HASH_SALT` — real random value, not the dev fallback
- [x] `CONTENT_ACCESS_SECRET` — real random value, not the dev fallback
- [x] `MORALIS_API_KEY` — set

### Web3
- [x] `POLYGON_RPC_URL` — set
- [x] `NFT_CONTRACT_ADDRESS` — set
- [x] `THIRDWEB_SECRET_KEY` — set
- [x] `MINTING_WALLET_PRIVATE_KEY` — set

`thirdwebService.js` reads `MINTING_WALLET_PRIVATE_KEY || BACKEND_WALLET_PRIVATE_KEY`
plus `THIRDWEB_SECRET_KEY`. **There is no `POLYGON_PRIVATE_KEY` in the code** —
an earlier version of this checklist asked for it, but setting it does nothing.
`ALCHEMY_API_KEY` is only a fallback used when `POLYGON_RPC_URL` is absent, so
it is not required.

## Backend Hosting — Railway
- [x] 24/7 host — project `truthful-creativity`, service `crownmania-backend`
- [x] All env variables set on the service (40 vars)
- [x] Health check — `GET /health` returns status, Firebase state, uptime
- [x] Auto-restart on crash — `restartPolicyType: ON_FAILURE`, 10 retries
- [x] `REDIS_URL` set, so the BullMQ queue workers start
- [ ] Uptime monitoring pinging `/health` (UptimeRobot or similar)
- [ ] Downtime alerting (email/SMS)

## Stripe Dashboard
- [x] Live mode — a real order has completed end to end
- [x] Live webhook endpoint enabled, API version `2024-10-28.acacia`
- [x] Subscribed events: `checkout.session.completed`,
      `payment_intent.payment_failed`, `charge.refunded`, `charge.dispute.created`
- [x] Webhook signing secret set
- [x] Signature verification implemented
- [x] Statement descriptor — `CROWNMANIA`
- [ ] **Checkout shows the owner's personal legal name instead of the LLC.**
      The account is registered as `business_type: individual`, so
      `business_profile.name` is a personal name and customers see it at
      checkout. Fix in the Stripe Dashboard: change business type from
      Individual to Company and supply the LLC legal name + EIN (requires
      verification documents). Not a code change.
- [ ] Minor: the webhook URL points at
      `crownmania-backend-production.up.railway.app` rather than
      `api.crownmania.com`. Works today, but would break if that Railway
      subdomain is ever detached.

## Error Monitoring
- [x] Sentry wired in backend (`@sentry/node`, env-gated) and frontend
      (`@sentry/react`, env-gated) — both inert until DSNs are set
- [ ] `SENTRY_DSN` not set on the backend — no error monitoring in production
- [ ] `VITE_SENTRY_DSN` not set on the frontend
- [ ] Alert routing (email/Slack) for critical errors

## Order Fulfillment & Operations

An admin panel now exists at `/admin` (email-OTP login via `/api/admin/login` +
`/api/admin/verify`, backed by `AdminPage.jsx` and `components/admin/*` —
Dashboard, Live Traffic, Orders, Claims, Users, Failures). Bulk or one-off
operations still run through scripts in `crownmania_backend/scripts/`:

| Task | Command |
| --- | --- |
| Inspect recent orders + inventory counts | `node scripts/checkOrder.js` |
| Mark an order shipped and email tracking | `node scripts/markShipped.js <orderId> <tracking#> [carrier]` |
| Resend an order confirmation | `node scripts/resendOrderEmail.js <orderId>` |
| Audit claim codes | `node scripts/checkClaimCodes.js` |
| Preview every email template without sending | `node scripts/previewEmails.js` |

`markShipped.js` refuses to double-ship or ship a refunded order. Carriers with
clickable tracking links: `usps`, `ups`, `fedex`, `dhl`.

## ShipStation integration (bulk shipping)

Orders push into ShipStation automatically at purchase time (awaiting_shipment).
Buy labels in bulk in the ShipStation dashboard; each label fires a SHIP_NOTIFY
webhook to `POST /api/shipstation/webhook`, which fetches the tracking number
and marks the order shipped + emails the customer — no manual entry.

Setup (one-time, requires `SHIPSTATION_API_KEY`/`SHIPSTATION_API_SECRET` set on
Railway from ShipStation → Account → API Settings):

```bash
node scripts/setupShipstation.js   # verifies creds, subscribes webhook, backfills paid orders
```

Optional env vars `SHIPSTATION_PACKAGE_WEIGHT_OZ` / `_LENGTH` / `_WIDTH` /
`_HEIGHT` pre-fill package details so labels can be bought without configuring
the package each time. If ShipStation is unconfigured the push is a logged no-op;
customer purchases are never blocked by it.

`previewEmails.js` intercepts the Resend transport at the fetch layer and writes
the real HTML to `crownmania_backend/email-previews/` — the exact bytes that
would have been delivered. Review templates there; **do not send to customers to
preview.** It covers every template, including `sendVerificationEmail`, which is
currently **dead code** — the endpoint exists (`POST /api/verification/
request-email-verification`) but no frontend code calls it, so no customer ever
receives that code.

### Serial numbers — important
Physical serial stickers are applied to boxes **at random**, so the serial
allocated at purchase time never matches the one the customer receives.
Confirmation emails therefore list product names and quantities only, and tell
the customer to use the sticker on their delivered box. Claims resolve against
the `claimCodes` collection, independent of the purchase-time allocation, so
any printed sticker verifies.

Do not reintroduce serials or per-order claim links into the confirmation email.

## Pre-Launch Testing
- [x] Full purchase flow — verified by a real live order: checkout → webhook →
      serial allocated → shipping address captured → confirmation email
- [ ] Verify a serial in the Vault → claim token → access exclusive perks
- [ ] Refund in Stripe Dashboard → confirm serials released back to inventory
- [ ] Fulfillment failure (empty inventory) → dead-letter queue entry + admin alert
- [ ] Mark an order shipped → confirm the tracking email arrives and the link works
- [x] Customer order lookup by email — live at `/track-order` behind a
      six-digit email-code challenge (generic responses prevent enumeration;
      returns order-safe fields only)

## Legal Pages
- [x] Terms of Service — `/terms-of-service`
- [x] Privacy Policy — `/privacy-policy`
- [x] Returns / Refunds — `/returns`
- [x] Shipping terms — covered within the legal content
- [ ] Legal pages do not name the LLC as the operating entity; worth adding
      alongside the Stripe business-type change

All routes render `src/pages/LegalPage.jsx` with real content (no placeholder
text). Note Firebase Hosting rewrites all unknown paths to `index.html`, so a
`200` response does **not** prove a route exists — check the router.

## Domain & DNS
- [x] `crownmania.com` and `www.crownmania.com` live on Firebase Hosting
- [x] SSL active
- [x] Backend API domain — `api.crownmania.com`
- [x] CORS restricted to the production domains (hardcoded in `server.js`,
      plus a tightened `*.vercel.app` pattern limited to the crownmania slug)

`crownmania.com` and `sonorous-crane-440603-s6.web.app` serve the same Firebase
site — the `.web.app` domain is the project default, not a separate deployment.

## Inventory
- [x] Inventory seeded — 369 available / 2 allocated against a 370-unit cap
- [x] 7,000 claim codes imported to `claimCodes` (3 claimed)
- [x] `GET /api/admin/inventory/count` available for the current count
- [ ] Process for replenishing inventory when running low

The 370 cap limits how many purchases the store accepts. It does **not** limit
claiming — all 7,000 sticker serials remain claimable regardless of the cap, so
it does not matter whether the printer produced all 7,000.
