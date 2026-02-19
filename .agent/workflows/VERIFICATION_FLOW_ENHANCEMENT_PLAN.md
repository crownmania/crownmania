# Verification Flow Enhancement Plan
**Created:** 2026-02-04
**Status:** In Progress

## Overview
This plan ensures the complete verification flow works properly: from QR scan → token transfer → persistent verification → visual mood change from grayscale to color.

## Current State Analysis

### ✅ Working Components
1. **LocalStorage Persistence** - `VERIFIED_SERIALS_KEY` stores verification state for 30 days
2. **Backend Claim Flow** - Atomic transaction prevents race conditions
3. **Edition Tracking** - Counter properly increments edition numbers (1-500)
4. **Wallet Integration** - Web3Auth creates and manages embedded wallets
5. **NFT Transfer Logic** - thirdwebService handles transfers (with retry gaps)

### ⚠️ Issues Identified from Audit Report
1. **NFT Transfer Failures** - No retry mechanism when Thirdweb Engine fails
2. **Missing Verified Date Display** - UI doesn't show "Verified on [date]"
3. **No Visual Mood Change** - Grayscale → Color transition not implemented
4. **Backend Missing claimDate in Response** - Claim API doesn't return `claimDate` field
5. **Edition Number Not Always Returned** - Verification doesn't return edition if already claimed

## Implementation Tasks

### Task 1: Add Verified Date Display to UI
**Priority:** HIGH  
**Files:** `Vault.jsx`

**Actions:**
- [ ] Add "Verified On" field to Details Panel
- [ ] Show formatted date from `verificationResult.claimDate` or localStorage
- [ ] Display in format: "Feb 4, 2026 at 6:34 PM"
- [ ] Show "Not Verified" if no date available

**Implementation:**
```jsx
<DetailItem>
  <label>Verified On</label>
  <div className={verificationResult?.claimDate || verificationResult?.verifiedAt ? 'highlight' : 'dim'}>
    {formatClaimDate(verificationResult?.claimDate || verificationResult?.verifiedAt) || '---'}
  </div>
</DetailItem>
```

---

### Task 2: Implement Visual Mood Change (Grayscale → Color)
**Priority:** HIGH  
**Files:** `Vault.jsx`, CSS variables

**Actions:**
- [ ] Add grayscale filter to entire vault when NOT verified
- [ ] Transition to full color saturation when verified
- [ ] Apply smooth transition animation (1-2 seconds)
- [ ] Ensure all images, 3D model, and UI elements transition

**Implementation:**
```jsx
// VaultContent styled component update
const VaultContent = styled.div`
  position: relative;
  transition: all 1.5s cubic-bezier(0.16, 1, 0.3, 1);
  
  ${props => !props.$verified && css`
    filter: grayscale(100%) brightness(0.7);
  `}
  
  ${props => props.$verified && css`
    filter: grayscale(0%) brightness(1) saturate(1.1);
  `}
`;

// Usage
<VaultContent $verified={isAssetVerified} $locked={isVaultLocked}>
```

---

### Task 3: Backend - Return claimDate in All Responses
**Priority:** HIGH  
**Files:** `verificationService.js`

**Actions:**
- [ ] Add `claimDate` field to `claimProduct` response (line 368-380)
- [ ] Add `claimDate` to `verifyProductById` when already claimed (line 132-148)
- [ ] Add `verifiedAt` to `verifySerialNumber` response
- [ ] Ensure `claimedAt` from Firestore is properly formatted as ISO string

**Implementation:**
```javascript
// In claimProduct return (line 368)
return {
  success: true,
  tokenId: claimResult.tokenId,
  blockchainTokenId: nftTransferResult?.tokenId || null,
  transactionHash: nftTransferResult?.transactionHash || null,
  edition: claimResult.editionNumber,
  totalEditions: claimResult.totalEditions,
  productName: claimResult.productName,
  nftTransferred: !!nftTransferResult,
  claimDate: new Date().toISOString(), // ADD THIS
  message: /* existing message */
};

// In verifyProductById when claimed (line 132)
return {
  verified: true,
  claimed: true,
  product: {
    // ... existing fields
    claimDate: claimCodeData.claimedAt?.toDate().toISOString() || new Date().toISOString(), // ADD THIS
  },
  message: 'This product is authentic but has already been claimed.'
};
```

---

### Task 4: NFT Transfer Retry Service
**Priority:** HIGH  
**Files:** `src/services/nftRetryService.js` (NEW), `src/scheduled/retryTransfers.js` (NEW)

**Actions:**
- [ ] Create `nftRetryService.js` with `retryPendingTransfers()` function
- [ ] Query collectibles where `nftTransferred: false` and `status: claimed`
- [ ] Attempt transfer via `transferNFTToWallet()`
- [ ] Update collectible record with transfer result
- [ ] Add retry count and last retry timestamp
- [ ] Send admin email alert on repeated failures (>3 retries)

**Implementation:**
```javascript
// src/services/nftRetryService.js
export async function retryPendingTransfers() {
  const pending = await db.collection('collectibles')
    .where('nftTransferred', '==', false)
    .where('status', '==', 'claimed')
    .get();

  const results = [];
  for (const doc of pending.docs) {
    const data = doc.data();
    const retryCount = (data.retryCount || 0) + 1;
    
    try {
      const result = await transferNFTToWallet(data.ownerId, data.blockchainTokenId);
      await doc.ref.update({
        nftTransferred: true,
        transactionHash: result.transactionHash,
        retryCount,
        lastRetryAt: new Date()
      });
      results.push({ id: doc.id, success: true });
    } catch (error) {
      await doc.ref.update({
        retryCount,
        lastRetryError: error.message,
        lastRetryAt: new Date()
      });
      
      // Alert admin if retry count > 3
      if (retryCount > 3) {
        await sendAdminAlert({
          type: 'nft_transfer_failed',
          collectibleId: doc.id,
          ownerId: data.ownerId,
          retryCount,
          error: error.message
        });
      }
      
      results.push({ id: doc.id, success: false, error: error.message });
    }
  }
  return results;
}
```

---

### Task 5: Add Transfer Status Endpoint
**Priority:** MEDIUM  
**Files:** `crownmania_backend/src/routes/verification.js`

**Actions:**
- [ ] Create GET endpoint `/api/verification/transfer-status/:serialNumber`
- [ ] Return transfer status: 'not_claimed', 'pending', 'transferred'
- [ ] Return edition number, transaction hash, owner address

**Implementation:**
```javascript
router.get('/transfer-status/:serialNumber', async (req, res) => {
  try {
    const { serialNumber } = req.params;
    const collectible = await db.collection('collectibles')
      .where('serialNumber', '==', serialNumber.toLowerCase())
      .limit(1)
      .get();
    
    if (collectible.empty) {
      return res.json({ status: 'not_claimed' });
    }
    
    const data = collectible.docs[0].data();
    return res.json({
      status: data.nftTransferred ? 'transferred' : 'pending',
      edition: data.edition,
      transactionHash: data.transactionHash || null,
      ownerId: data.ownerId,
      claimDate: data.createdAt?.toDate().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

### Task 6: Frontend - Poll Transfer Status (Optional)
**Priority:** LOW  
**Files:** `Vault.jsx`

**Actions:**
- [ ] After claim, poll `/transfer-status/:serialNumber` every 5 seconds
- [ ] Update UI when `nftTransferred` becomes true
- [ ] Show "Transfer Pending..." vs "Transfer Complete" badge

---

### Task 7: Extend LocalStorage Expiry to 365 Days
**Priority:** LOW  
**Files:** `Vault.jsx`

**Actions:**
- [ ] Change `VERIFICATION_EXPIRY_DAYS` from 30 to 365
- [ ] Users keep verified state for 1 year instead of 30 days

**Implementation:**
```javascript
const VERIFICATION_EXPIRY_DAYS = 365; // Changed from 30
```

---

### Task 8: Backend Edition Number in getWalletTokens
**Priority:** MEDIUM  
**Files:** `verificationService.js` (line 573-602)

**Actions:**
- [ ] Ensure `getWalletTokens()` returns `edition` field
- [ ] Map `data.edition` to the return object

**Implementation:**
```javascript
// In getWalletTokens (line 584)
return snapshot.docs.map(doc => {
  const data = doc.data();
  return {
    id: doc.id,
    productId: data.productId,
    productName: data.productName,
    serialNumber: data.serialNumber,
    tokenId: data.tokenId,
    edition: data.edition, // ADD THIS
    editionNumber: data.edition, // ADD THIS (alias)
    tokenAddress: data.contractAddress, // ADD THIS
    modelUrl: data.metadata?.modelUrl || data.modelUrl,
    imageUrl: data.metadata?.image,
    issuedAt: data.createdAt ? data.createdAt.toDate() : new Date(),
    claimDate: data.createdAt?.toDate().toISOString(), // ADD THIS
    metadata: data.metadata
  };
});
```

---

## Testing Protocol

### Manual Test Checklist
- [ ] **Scan QR Code** - Verify serial number recognition
- [ ] **Verify Product** - Confirm UI shows "VERIFIED" status
- [ ] **Check Visual Change** - Vault transitions from grayscale to color
- [ ] **Connect Wallet** - Web3Auth login works
- [ ] **Claim NFT** - Token transfer succeeds
- [ ] **Check Edition Display** - Shows "#X / 500"
- [ ] **Check Date Display** - Shows "Verified On: [date]"
- [ ] **Logout and Login** - Verification persists from localStorage
- [ ] **Re-scan Same Code** - Shows already claimed with date
- [ ] **Check Firestore** - `collectibles` record exists with correct data
- [ ] **Check Polygonscan** - NFT appears in wallet

### Automated Tests
- [ ] Run `npm test` in `crownmania_backend`
- [ ] Verify `nftClaiming.test.js` passes
- [ ] Verify `duplicateClaim.test.js` prevents race conditions

---

## Environment Variables Verification

### Backend (.env)
```bash
# Thirdweb
THIRDWEB_SECRET_KEY=<secret_key>
THIRDWEB_NFT_CONTRACT=<polygon_contract_address>
THIRDWEB_ENGINE_URL=https://engine.thirdweb.com
THIRDWEB_ENGINE_ACCESS_TOKEN=<engine_token>
NFT_OWNER_WALLET=<wallet_with_pre_minted_nfts>
MINTING_WALLET_PRIVATE_KEY=<private_key_for_fallback>

# Firebase
FIREBASE_PROJECT_ID=<project_id>
FIREBASE_PRIVATE_KEY=<private_key>
FIREBASE_CLIENT_EMAIL=<client_email>

# SendGrid
SENDGRID_API_KEY=<sendgrid_key>
```

### Frontend (.env)
```bash
VITE_WEB3AUTH_CLIENT_ID=<web3auth_client_id>
VITE_WEB3_RPC_TARGET=https://polygon-rpc.com
VITE_API_BASE_URL=https://your-backend.com/api
```

---

## Success Criteria
1. ✅ User scans QR code → sees "VERIFIED" immediately
2. ✅ Vault UI transitions from grayscale → full color
3. ✅ User connects wallet → claims NFT
4. ✅ Edition number displays correctly (#1-500)
5. ✅ Verified date shows in UI ("Verified On: Feb 4, 2026")
6. ✅ User closes browser and returns → still shows verified with date
7. ✅ NFT appears in user's Web3Auth wallet
8. ✅ Backend records claim with `nftTransferred: true`
9. ✅ If NFT transfer fails, retry service recovers it
10. ✅ Admin receives alert if transfer fails 3+ times

---

## Timeline
- **Task 1-3:** 2-3 hours (UI + Backend date fixes)
- **Task 4-5:** 3-4 hours (Retry service + status endpoint)
- **Task 6-8:** 1-2 hours (Polish + edge cases)
- **Testing:** 2-3 hours

**Total Estimate:** 8-12 hours

---

## Notes
- Frontend-backend sync critical: ensure `claimDate` is always returned
- Visual transition should feel premium (1.5s smooth cubic-bezier)
- LocalStorage allows recurring users to see verified state without blockchain call
- Retry service should run every 15 minutes via cron job or Cloud Scheduler
