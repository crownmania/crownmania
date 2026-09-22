# Crownmania — Agent Notes

Monorepo with npm workspaces: `crownmania_backend` (Express API on Railway) and
`crownmania_frontend` (Vite/React on Firebase Hosting). This store is **live and
takes real payments** — treat production changes accordingly.

## Deploying the backend

Run `railway up` from the **repo root**, never from `crownmania_backend/`:

```bash
cd <repo root>
railway up
railway status    # must read "● Online", NOT "● Online · Deploy failed"
curl https://api.crownmania.com/health   # uptime should be low
```

The Railway service builds from the repo root (`railway.json` has
`watchPatterns: crownmania_backend/**` and
`startCommand: cd crownmania_backend && npm install && node src/server.js`).
Running `railway up` from inside the backend folder fails with
`Failed to read app source directory`.

**A failed deploy looks like a successful one.** Railway keeps serving the
previous image, so the site stays healthy and `railway up` exits 0. Production
once ran a 16-day-old image while changes appeared "deployed". Always confirm a
new deployment ID and a reset uptime. To read a failed build's logs:
`railway logs -b <deploymentId> --lines 200` (`-b`/`-d` are flags; the
deployment ID is positional, and it defaults to the last *successful* deploy).

`railway redeploy` only re-runs the last good image with current env vars. It
does not ship new code, but it *does* reset uptime — do not read that as proof
of a deploy.

Env vars live on the Railway *service* (project `truthful-creativity`, service
`crownmania-backend`), so they persist across deployments. A new deployment ID
never means lost secrets.

## Deploying the frontend

`firebase deploy --only hosting` **from the repo root**, using the Homebrew CLI
(`/opt/homebrew/bin/firebase`). Pushing to `main` does **not** deploy it — the
only Firebase workflow is a pull-request preview.

Do not use `npm run deploy` in `crownmania_frontend`: it resolves `firebase` to
a corrupt local `firebase-tools` in that workspace's `node_modules` and dies on
a missing `lib/templates/hosting/init.js` before deploying. Credentials also
expire periodically — `firebase login --reauth` fixes
`Authentication Error: Your credentials are no longer valid`. `crownmania.com` and
`sonorous-crane-440603-s6.web.app` are the same site.

Firebase Hosting rewrites unknown paths to `index.html`, so a `200` does not
prove a route exists. Check the router in `src/App.jsx`.

## Product landing pages & marketing links

Each sellable product has a vanity URL for ads: `crownmania.com/shop/<slug>`
(currently `/shop/lildurk`). The slug lives on the product in
`crownmania_frontend/src/data/productData.js` alongside `tagline` and
`ogImage`, which feed the social preview.

Because the app is a client-rendered SPA behind a catch-all rewrite, crawlers
never run the JS and would see only the homepage tags. `vite-plugins/productOgTags.js`
solves this at build time: it clones `dist/index.html` into
`dist/shop/<slug>/index.html` with product-specific Open Graph / Twitter tags,
replacing everything between the `SOCIAL_META_START` / `SOCIAL_META_END`
markers in `index.html`. **Do not remove those markers** — the build throws if
they're missing. Firebase serves matching static files before applying
rewrites, so the crawler gets real tags and React still renders for humans.

Adding a product: give it a `slug`, `tagline`, `ogImage`, and `active: true`,
and both the route and the OG page are generated from `LINKABLE_PRODUCTS`.
OG images must be 1200x630 JPEG/PNG (not webp — X/Twitter cards are unreliable
with it); `sips --padToHeightWidth 630 1200 --padColor FFFFFF` is enough.

Checkout goes through `src/utils/checkout.js`; prices always resolve from
`PRODUCT_CATALOG` in `crownmania_backend/src/routes/stripe.js`, never the client.

## Verification

- `node --check <file>` for syntax on changed backend files
- `node scripts/checkOrder.js` — recent orders + inventory counts
- CI (`.github/workflows/ci.yml`) runs backend tests/lint on push to `main`

## Gotchas

- **Email is Resend, not SendGrid.** `sgMail` in `src/config/email.js` is a shim
  keeping the SendGrid call signature, which is why vars are named
  `SENDGRID_FROM_EMAIL`. `@sendgrid/mail` and `SENDGRID_API_KEY` are unused.
- **Never put serial numbers or per-order claim links in customer emails.**
  Physical serial stickers are randomized per box, so a purchase-time serial
  never matches what the customer receives. Claims resolve against the
  `claimCodes` collection instead.
- `FRONTEND_URL` must be `https://crownmania.com` (the custom domain). It feeds
  Stripe `success_url`/`cancel_url` and email links; the raw `.web.app` domain
  bounces paying customers to a different origin.
- `thirdwebService.js` uses `MINTING_WALLET_PRIVATE_KEY` /
  `BACKEND_WALLET_PRIVATE_KEY` / `THIRDWEB_SECRET_KEY`. There is no
  `POLYGON_PRIVATE_KEY` despite older docs mentioning it.
- The admin panel lives at `/admin` — email OTP login via `/api/admin/login` +
  `/api/admin/verify` (`AdminPage.jsx` + `components/admin/*`). Bulk operations
  still run through `crownmania_backend/scripts/` (see `PRODUCTION_READINESS.md`).
- `.env` and `serviceAccountKey*.json` are gitignored — keep them that way.
- `github.com` may be unreachable from sandboxed environments; ask the user to
  run `git push` rather than assuming the remote is broken.

See `PRODUCTION_READINESS.md` for verified production state and open items.
