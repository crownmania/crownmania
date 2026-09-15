# Crownmania Production Readiness Checklist

Status verified against live production on 2026-09-13. `[x]` means confirmed
working by direct inspection, not assumed. Items marked **UNVERIFIED** need a
console check nobody has done yet.

The store is live and has taken real orders. What follows is what is actually
configured, plus what is genuinely still missing.

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
- [ ] **UNVERIFIED** Firestore security rules deployed (`firebase deploy --only firestore:rules`)
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
- [ ] `SENTRY_DSN` not set on the backend — no error monitoring in production
- [ ] Add Sentry to the frontend
- [ ] Alert routing (email/Slack) for critical errors

## Order Fulfillment & Operations

There is **no admin UI** — the frontend contains no admin panel. The admin API
exists at `/api/admin/*` behind email-OTP auth, but day-to-day operations run
through scripts in `crownmania_backend/scripts/`:

| Task | Command |
| --- | --- |
| Inspect recent orders + inventory counts | `node scripts/checkOrder.js` |
| Mark an order shipped and email tracking | `node scripts/markShipped.js <orderId> <tracking#> [carrier]` |
| Resend an order confirmation | `node scripts/resendOrderEmail.js <orderId>` |
| Audit claim codes | `node scripts/checkClaimCodes.js` |

`markShipped.js` refuses to double-ship or ship a refunded order. Carriers with
clickable tracking links: `usps`, `ups`, `fedex`, `dhl`.

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
- [ ] Customer order lookup by email

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
