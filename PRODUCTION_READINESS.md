# Crownmania Production Readiness Checklist

## Environment Variables (CRITICAL — must be set in production)

### Stripe
- [ ] `STRIPE_SECRET_KEY` — live secret key (`sk_live_...`)
- [ ] `STRIPE_WEBHOOK_SECRET` — from the live webhook endpoint in Stripe Dashboard
- [ ] `FRONTEND_URL` — your production domain (e.g. `https://crownmania.com`)

### Firebase
- [ ] `FIREBASE_STORAGE_BUCKET` — your storage bucket name
- [ ] Service account key file deployed (`serviceAccountKey.json`)
- [ ] Firestore security rules deployed (`firebase deploy --only firestore:rules`)

### Email (SendGrid)
- [ ] `SENDGRID_API_KEY` — live SendGrid API key
- [ ] `SENDGRID_FROM_EMAIL` — verified sender (e.g. `noreply@crownmania.com`)
- [ ] `ADMIN_ALERT_EMAIL` — where operational alerts are sent (fulfillment failures, disputes)
- [ ] SendGrid domain authentication completed (so emails don't hit spam)

### Security
- [ ] `SERIAL_HASH_SALT` — real random value (not the dev fallback)
- [ ] `CONTENT_ACCESS_SECRET` — real random value (not the dev fallback)
- [ ] `MORALIS_API_KEY` — for on-chain NFT ownership verification

### Web3
- [ ] `POLYGON_RPC_URL` — production RPC endpoint
- [ ] Contract addresses configured in `web3Config.js`
- [ ] `POLYGON_PRIVATE_KEY` — for minting tokens (if auto-mint enabled)

## Backend Hosting
- [ ] Deploy backend to a 24/7 hosting provider (Railway / Render / Cloud Run)
- [ ] Set all environment variables in the hosting provider's dashboard
- [ ] Configure health check endpoint (`GET /health`)
- [ ] Enable auto-restart on crash
- [ ] Set up uptime monitoring (UptimeRobot or similar) pinging `/health`
- [ ] Configure alerting on downtime (email/SMS)

## Stripe Dashboard
- [ ] Switch from test mode to live mode
- [ ] Create live webhook endpoint pointing to production backend URL: `https://<api-domain>/api/stripe/webhook`
- [ ] Subscribe to events: `checkout.session.completed`, `payment_intent.payment_failed`, `charge.refunded`, `charge.dispute.created`
- [ ] Copy the live webhook signing secret to `STRIPE_WEBHOOK_SECRET`
- [ ] Verify webhook signature is being checked (already implemented)

## Firestore
- [ ] Deploy firestore rules: `firebase deploy --only firestore:rules`
- [ ] Enable scheduled backups (Firebase Console → Firestore → Backups)
- [ ] Create composite indexes if any queries require them (check console warnings)

## Error Monitoring
- [ ] Add Sentry DSN to frontend and backend
- [ ] Test that errors flow to Sentry dashboard
- [ ] Set up alert routing (email/Slack) for critical errors

## Pre-Launch Testing (Stripe Test Mode)
- [ ] Full purchase flow: add to cart → checkout → pay (test card 4242 4242 4242 4242) → webhook fires → serial allocated → confirmation email received
- [ ] Verify serial code in Vault → claim token → access exclusive perks
- [ ] Test refund in Stripe Dashboard → verify serials released back to inventory
- [ ] Test fulfillment failure (e.g. empty inventory) → verify dead-letter queue entry + admin alert email
- [ ] Test admin order endpoints: list orders, mark shipped, verify shipping email sent
- [ ] Test customer order lookup by email

## Legal Pages
- [ ] Terms of Service page with real content
- [ ] Privacy Policy page with real content
- [ ] Refund/Return Policy page with real content
- [ ] Shipping Policy page (countries, timelines, costs)

## Domain & DNS
- [ ] Production domain pointed to Firebase Hosting
- [ ] SSL certificate active (Firebase Hosting provides this automatically)
- [ ] Backend API domain configured (subdomain e.g. `api.crownmania.com`)
- [ ] CORS origins in backend set to production domain only

## Inventory
- [ ] Seed inventory with real serial numbers before launch
- [ ] Verify `GET /api/admin/inventory/count` shows correct available count
- [ ] Set up process to replenish inventory when running low
