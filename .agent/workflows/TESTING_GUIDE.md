# 🧪 CrownMania Verification Flow - Testing Guide
**Date:** February 4, 2026  
**Purpose:** Comprehensive testing procedures for the enhanced verification flow

---

## 🎯 Testing Objectives

1. **Visual Mood Change** - Confirm grayscale → color transition works smoothly
2. **Verification Persistence** - Ensure verified state persists across sessions
3. **Date Display** - Verify "Verified On" shows correctly
4. **NFT Transfer** - Confirm tokens reach user wallets
5. **Retry Service** - Test automatic retry for failed transfers
6. **Backend Sync** - Ensure frontend and backend data stays in sync

---

## 🔧 Pre-Test Setup

### 1. Environment Configuration

**Backend (.env):**
```bash
# Verify these are set correctly:
THIRDWEB_SECRET_KEY=your_actual_secret_key
THIRDWEB_NFT_CONTRACT=0x... # Polygon contract address
THIRDWEB_ENGINE_ACCESS_TOKEN=your_engine_token
NFT_OWNER_WALLET=0x... # Wallet with pre-minted NFTs
MINTING_WALLET_PRIVATE_KEY=your_private_key
FIREBASE_PROJECT_ID=sonorous-crane-440603-s6
ADMIN_EMAIL=admin@crownmania.com
```

**Frontend (.env):**
```bash
VITE_API_BASE_URL=http://localhost:5000  # Or production URL
VITE_WEB3AUTH_CLIENT_ID=your_client_id
```

### 2. Start Services

**Terminal 1 - Backend:**
```powershell
cd crownmania_main copy\crownmania_backend
npm install
npm run dev
```

**Terminal 2 - Frontend:**
```powershell
cd crownmania_main copy\crownmania_frontend
npm install
npm run dev
```

**Expected Output:**
- Backend: `Server running on http://localhost:5000`
- Frontend: `Local: http://localhost:5173`

---

## 📋 Test Scenarios

### **Test 1: Visual Mood Change (Grayscale → Color)**

**Objective:** Verify smooth color transition when verification succeeds

**Steps:**
1. Open `http://localhost:5173` in browser
2. Navigate to Vault section
3. **Expected:** Vault should be **grayscale** and desaturated
4. Enter a valid serial number (or scan QR)
5. Click "VERIFY CODE"
6. **Expected:** Vault **smoothly transitions** from grayscale → full color (1.5s)
7. Observe: Image saturation increases, colors become vibrant

**Success Criteria:**
- ✅ Initial state: `filter: grayscale(100%) brightness(0.7)`
- ✅ After verification: `filter: grayscale(0%) brightness(1) saturate(1.1)`
- ✅ Transition is smooth (no jarring jump)
- ✅ All elements (images, 3D model, UI) change together

**Failure Indicators:**
- ❌ Vault stays grayscale after verification
- ❌ Color transition is instant (no animation)
- ❌ Only some elements change color
- ❌ Browser console shows errors

---

### **Test 2: Verified Date Display**

**Objective:** Confirm "Verified On" date shows correctly

**Steps:**
1. After successful verification from Test 1
2. Scroll to "Details Panel" section
3. Locate "Verified On" field
4. **Expected:** Shows date like "Feb 4, 2026 at 6:34 PM"
5. Refresh the page (F5)
6. **Expected:** Date persists (loaded from localStorage)
7. Clear browser localStorage (DevTools → Application → Local Storage → Clear)
8. Refresh page
9. **Expected:** "Verified On" shows "Not Verified"

**Success Criteria:**
- ✅ Date displays in human-readable format
- ✅ Date persists across page refreshes
- ✅ Date matches when verification occurred
- ✅ Falls back to "Not Verified" if no data

**Failure Indicators:**
- ❌ Shows "Not Verified" even after verifying
- ❌ Date is in raw ISO format (ugly)
- ❌ Date disappears on refresh
- ❌ Shows wrong date/time

---

### **Test 3: Backend claimDate Response**

**Objective:** Ensure all API responses include `claimDate`

**API Test 1: Verify Serial Number**
```powershell
# Using curl or Postman
curl -X POST http://localhost:5000/api/verification/verify-serial `
  -H "Content-Type: application/json" `
  -d '{"serialNumber": "YOUR_SERIAL_NUMBER_HERE"}'
```

**Expected Response:**
```json
{
  "verified": true,
  "claimed": false,
  "product": {
    "id": "...",
    "productId": "lil-durk-figure",
    "name": "Lil Durk 10-inch Resin Figure",
    "claimDate": "2026-02-04T11:34:54.000Z"  // ← Must be present
  },
  "message": "Product verified successfully."
}
```

**API Test 2: Claim Product**
```powershell
curl -X POST http://localhost:5000/api/verification/claim `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" `
  -d '{
    "productId": "YOUR_SERIAL",
    "walletAddress": "0x...",
    "signature": "...",
    "message": "..."
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "tokenId": "NFT-...",
  "edition": 1,
  "editionNumber": 1,  // ← Both should exist
  "totalEditions": 500,
  "claimDate": "2026-02-04T11:34:54.000Z",  // ← Must be present
  "nftTransferred": true,
  "message": "NFT transferred successfully! ..."
}
```

**Success Criteria:**
- ✅ `claimDate` field exists in response
- ✅ Date is valid ISO 8601 format
- ✅ Both `edition` and `editionNumber` present
- ✅ `nftTransferred` boolean is correct

---

### **Test 4: NFT Transfer & Retry Logic**

**Scenario A: Successful Transfer**

**Steps:**
1. Complete verification (Test 1)
2. Connect wallet via Web3Auth
3. Click "CLAIM" button
4. Wait for backend response (~5-10 seconds)
5. **Expected:** Success message with transaction hash
6. Check Firestore `collectibles` collection
7. **Expected:** Document has `nftTransferred: true`

**Firestore Verification:**
```json
{
  "serialNumber": "...",
  "ownerId": "0x...",
  "status": "claimed",
  "edition": 1,
  "nftTransferred": true,
  "transactionHash": "0x...",
  "contractAddress": "0x...",
  "createdAt": "...",
  "retryCount": 0
}
```

**Scenario B: Failed Transfer (Simulated)**

**Steps:**
1. Temporarily set invalid `THIRDWEB_ENGINE_ACCESS_TOKEN` in backend .env
2. Restart backend
3. Attempt to claim NFT
4. **Expected:** Claim succeeds, but `nftTransferred: false`
5. Check Firestore collectible document
6. **Expected:** `nftTransferError` field populated
7. Restore correct `THIRDWEB_ENGINE_ACCESS_TOKEN`
8. Run retry service manually:

```javascript
// In backend console or create test endpoint
import { retryPendingTransfers } from './services/nftRetryService.js';

const results = await retryPendingTransfers();
console.log(results);
// Expected: { attempted: 1, succeeded: 1, failed: 0 }
```

9. Check Firestore again
10. **Expected:** `nftTransferred: true`, `retryCount: 1`

**Success Criteria:**
- ✅ Failed transfers don't break claim flow
- ✅ Collectible record created even if transfer fails
- ✅ Retry service successfully recovers failed transfers
- ✅ `retryCount` increments correctly

---

### **Test 5: Transfer Status Endpoint**

**Objective:** Verify status endpoint returns correct data

**API Test:**
```powershell
curl http://localhost:5000/api/verification/transfer-status/YOUR_SERIAL_NUMBER
```

**Expected Response (Transferred):**
```json
{
  "status": "transferred",
  "edition": 1,
  "totalEditions": 500,
  "transactionHash": "0x...",
  "contractAddress": "0x...",
  "ownerId": "0x...",
  "claimDate": "2026-02-04T11:34:54.000Z",
  "retryCount": 0,
  "lastRetryError": null,
  "message": "NFT successfully transferred to wallet"
}
```

**Expected Response (Not Claimed):**
```json
{
  "status": "not_claimed",
  "message": "This product has not been claimed yet"
}
```

**Expected Response (Pending):**
```json
{
  "status": "pending",
  "edition": 1,
  "retryCount": 2,
  "lastRetryError": "Thirdweb Engine timeout",
  "message": "NFT transfer pending - will be retried automatically"
}
```

**Success Criteria:**
- ✅ Status reflects actual Firestore state
- ✅ All fields present for transferred status
- ✅ Retry info shown for pending status

---

### **Test 6: LocalStorage Persistence**

**Objective:** Ensure verification persists across browser sessions

**Steps:**
1. Complete verification (should be full color now)
2. Note the "Verified On" date
3. Close browser completely
4. Reopen browser at `http://localhost:5173`
5. Navigate to Vault
6. **Expected:** Vault is **immediately in full color**
7. **Expected:** "Verified On" shows same date as before
8. **Expected:** Status shows "ASSET VERIFIED"

**DevTools Check:**
```javascript
// Open console (F12)
JSON.parse(localStorage.getItem('crownmania_verified_serials'));
// Expected: Array with verification data
```

**Success Criteria:**
- ✅ Color persists without re-verification
- ✅ Date persists in localStorage
- ✅ localStorage data structure is correct
- ✅ Expiry logic works (30 days default)

---

### **Test 7: Re-Scan Already Claimed Code**

**Objective:** Verify proper handling of already-claimed serials

**Steps:**
1. Use a serial number that was already claimed
2. Enter it in the verification field
3. Click "VERIFY CODE"
4. **Expected:** Message: "This product is authentic but has already been claimed."
5. **Expected:** Edition number shows (e.g., "#42 / 500")
6. **Expected:** "Verified On" shows original claim date
7. Vault should transition to color (if not already)

**Backend Check:**
```json
{
  "verified": true,
  "claimed": true,
  "product": {
    "edition": 42,
    "claimDate": "2026-01-15T10:22:33.000Z",  // Original date
    "claimedBy": "0x..."
  }
}
```

**Success Criteria:**
- ✅ Shows "already claimed" message
- ✅ Edition number displays correctly
- ✅ Original claim date shown (not current date)
- ✅ Vault still unlocks visually

---

### **Test 8: Mobile Responsiveness**

**Objective:** Ensure visual effects work on mobile

**Steps:**
1. Open Chrome DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select mobile device (e.g., iPhone 12 Pro)
4. Navigate to Vault
5. Perform verification
6. **Expected:** Color transition works smoothly on mobile
7. **Expected:** "Verified On" date readable on small screen
8. Test portrait and landscape orientations

**Success Criteria:**
- ✅ Transition smooth on mobile (no lag)
- ✅ Text doesn't overlap or clip
- ✅ All details visible without scrolling

---

## 🚨 Common Issues & Solutions

### Issue: "Vault stays grayscale after verification"

**Diagnosis:**
```javascript
// In browser console
const vault = document.querySelector('[id="vault"]').nextSibling;
console.log(window.getComputedStyle(vault).filter);
// Should be: "grayscale(0) brightness(1) saturate(1.1)"
```

**Solutions:**
- Check React state: `isAssetVerified` should be true
- Verify styled-components props: `$verified={true}`
- Check browser console for JS errors

---

### Issue: "Verified date shows 'Not Verified'"

**Diagnosis:**
```javascript
// Check localStorage
JSON.parse(localStorage.getItem('crownmania_verified_serials'));
// Should have: verifiedAt or claimDate field

// Check API response
// Should include: claimDate in response
```

**Solutions:**
- Verify backend returns `claimDate` in all responses
- Check frontend saves to localStorage correctly
- Ensure date formatting function works

---

### Issue: "NFT not in wallet after claim"

**Diagnosis:**
```powershell
# Check transfer status
curl http://localhost:5000/api/verification/transfer-status/SERIAL
```

**Solutions:**
- If `status: "pending"` → Run retry service
- If `status: "transferred"` → Check wallet on Polygonscan
- If `retryCount > 3` → Check admin alerts, verify Thirdweb config

---

## ✅ Final Acceptance Checklist

Before declaring testing complete, verify ALL of these:

**Visual Experience:**
- [ ] Vault is grayscale before verification
- [ ] Vault smoothly transitions to color (1.5s)
- [ ] All images/3D model saturate together
- [ ] Animation feels premium (not jarring)

**Data Accuracy:**
- [ ] "Verified On" shows correct date/time
- [ ] Edition number displays (#1-500)
- [ ] Backend responses include `claimDate`
- [ ] LocalStorage persists data correctly

**NFT Transfer:**
- [ ] Successful transfers show transaction hash
- [ ] Failed transfers recorded in Firestore
- [ ] Retry service recovers failed transfers
- [ ] Admin alerts sent after 3 failures

**Persistence:**
- [ ] Verification survives page refresh
- [ ] Verification survives browser close/reopen
- [ ] Expires correctly after 30 days
- [ ] Re-scanning shows original claim date

**Cross-Browser:**
- [ ] Works in Chrome
- [ ] Works in Firefox
- [ ] Works in Safari
- [ ] Works on mobile (iOS/Android)

---

## 📊 Test Results Template

```markdown
## Test Run: [Date/Time]
**Tester:** [Name]
**Environment:** [Local/Staging/Production]

### Test 1: Visual Mood Change
- Status: ✅ PASS / ❌ FAIL
- Notes: [Any issues or observations]

### Test 2: Verified Date Display
- Status: ✅ PASS / ❌ FAIL
- Notes: [Any issues or observations]

### Test 3: Backend claimDate Response
- Status: ✅ PASS / ❌ FAIL
- API Response Sample: [JSON snippet]

### Test 4: NFT Transfer & Retry
- Status: ✅ PASS / ❌ FAIL
- Transfer Success Rate: X/Y
- Retry Recovery: X recovered / Y failed

### Test 5: Transfer Status Endpoint
- Status: ✅ PASS / ❌ FAIL
- Notes: [Endpoint accuracy check]

### Test 6: LocalStorage Persistence
- Status: ✅ PASS / ❌ FAIL
- Notes: [Persistence duration test]

### Test 7: Re-Scan Already Claimed
- Status: ✅ PASS / ❌ FAIL
- Notes: [Error handling check]

### Test 8: Mobile Responsiveness
- Status: ✅ PASS / ❌ FAIL
- Devices Tested: [List]

---
**Overall Status:** ✅ READY FOR PRODUCTION / ⚠️ NEEDS FIXES / ❌ BLOCKED

**Blockers:** [List any critical issues]
**Next Steps:** [What needs to happen before launch]
```

---

## 🚀 Ready for Production?

**Yes, if:**
- ✅ All 8 tests pass
- ✅ No critical bugs found
- ✅ Visual experience is smooth
- ✅ NFT transfer success rate > 95%
- ✅ Retry service recovers failures

**No, if:**
- ❌ Vault doesn't change color
- ❌ Dates don't persist
- ❌ NFT transfers fail frequently (>5%)
- ❌ Mobile experience is broken
- ❌ Browser console has errors

---

**Good luck with testing! 🎉**
