# 🔐 CROWNMANIA SECURITY GUIDE

## ⚠️ CRITICAL: Credential Rotation Required

**Your Firebase service account credentials and other secrets were previously exposed in this repository.** You must rotate ALL credentials immediately.

---

## 🔴 IMMEDIATE ACTION REQUIRED

### 1. Rotate Firebase Service Account Key

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project: `sonorous-crane-440603-s6`
3. Navigate to **IAM & Admin** > **Service Accounts**
4. Find the service account: `firebase-adminsdk-7v2rm@sonorous-crane-440603-s6.iam.gserviceaccount.com`
5. Click on it, then go to **Keys** tab
6. **Delete the old key** (ID ending in `...7724b8` and `...0958f70`)
7. Click **Add Key** > **Create new key** > **JSON**
8. Download the new key file
9. Either:
   - Place it at `crownmania_backend/src/config/serviceAccountKey.json` (make sure .gitignore excludes it)
   - OR extract values and add to `.env` file

### 2. Rotate Other Credentials

| Service | Action Required |
|---------|----------------|
| **Stripe** | Go to Stripe Dashboard > Developers > API Keys > Roll keys |
| **Web3Auth** | Go to Web3Auth Dashboard > Create new client ID |
| **SendGrid** | Go to SendGrid > Settings > API Keys > Create & Revoke |
| **Moralis** | Go to Moralis Admin > Create new API key |

---

## 📁 Files You Should NEVER Commit

These files are now in `.gitignore` but verify they're not tracked:

```bash
# Check if these files are tracked
git ls-files | grep -E "\.env|serviceAccountKey"

# If any are tracked, remove them from git (keeps local file)
git rm --cached crownmania_backend/.env
git rm --cached crownmania_frontend/.env
git rm --cached crownmania_backend/src/config/serviceAccountKey.json
```

---

## 🔒 Security Best Practices

### Environment Variables

1. **Never commit `.env` files** - They contain secrets
2. **Use `.env.example`** - Template without real values
3. **Use environment-specific files** - `.env.development`, `.env.production`
4. **In production** - Use platform secrets (Vercel, GCP Secret Manager, etc.)

### Firebase Credentials

**Option A: JSON File (Development)**
```bash
# Place at: crownmania_backend/src/config/serviceAccountKey.json
# This file is in .gitignore
```

**Option B: Environment Variables (Production)**
```bash
# In your .env file:
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-email@project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_CLIENT_CERT_URL=https://...
FIREBASE_STORAGE_BUCKET=your-bucket.appspot.com
```

### Frontend Security

**NEVER put these in frontend `.env` (VITE_* prefix exposes to browser):**
- Secret keys (Stripe secret, SendGrid, etc.)
- Firebase Admin SDK credentials
- Any private API keys

**Safe for frontend:**
- Firebase client config (API key, auth domain - these are meant to be public)
- Stripe publishable key
- Public API URLs

---

## 🛡️ Security Features Implemented

### Backend Security
- ✅ Helmet.js with CSP enabled in production
- ✅ CORS restricted to specific origins
- ✅ Rate limiting on all endpoints
- ✅ Stricter rate limiting on auth endpoints
- ✅ Input validation on Stripe checkout
- ✅ Server-side price verification (never trust client prices)
- ✅ Wallet signature verification with:
  - Timestamp validation (5-minute window)
  - Nonce tracking (prevents replay attacks)
  - Message format validation

### Frontend Security
- ✅ Debug logs only in development mode
- ✅ Environment-aware configuration
- ✅ Proper .gitignore for sensitive files

---

## 📋 Security Checklist

Before deploying to production:

- [ ] Rotated all Firebase service account keys
- [ ] Rotated Stripe API keys
- [ ] Rotated Web3Auth client ID
- [ ] Rotated SendGrid API key
- [ ] Rotated Moralis API key
- [ ] Verified `.env` files are not in git
- [ ] Verified `serviceAccountKey.json` is not in git
- [ ] Set `NODE_ENV=production` in production
- [ ] Configured production CORS origins in server.js
- [ ] Set up proper secrets management (GCP Secret Manager, Vercel, etc.)
- [ ] Enabled HTTPS (required for production)
- [ ] Set up monitoring and alerting

---

## 🔍 Git History Cleanup (Optional but Recommended)

If your repository has been public or shared, credentials in git history are still exposed. Consider:

### Option 1: BFG Repo-Cleaner (Recommended)
```bash
# Install BFG
brew install bfg  # macOS

# Remove sensitive files from history
bfg --delete-files serviceAccountKey.json
bfg --delete-files .env

# Clean and force push
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force
```

### Option 2: Start Fresh
```bash
# If history is too compromised, create a new repo
# Copy files to new location, initialize new git repo
```

---

## 📞 Security Contacts

If you discover a security vulnerability:
1. Do NOT open a public GitHub issue
2. Contact the development team directly
3. Provide details of the vulnerability

---

## 📚 Additional Resources

- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [Stripe Security Best Practices](https://stripe.com/docs/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)

---

*Last Updated: December 29, 2024*
*Security Audit By: Automated Security Review*