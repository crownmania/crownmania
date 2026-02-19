# 🔄 CrownMania Verification Flow Diagram

## User Journey Visualization

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         INITIAL STATE                                   │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  🎨 Vault UI: GRAYSCALE (filter: grayscale(100%))              │   │
│  │  🔒 Status: "ASSET LOCKED"                                      │   │
│  │  📅 Verified On: "Not Verified"                                 │   │
│  │  🎭 Mood: Dark, desaturated, locked feeling                     │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
                                    ↓ User scans QR / enters serial
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    VERIFICATION REQUEST                                 │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  📱 Frontend → Backend                                           │   │
│  │  POST /api/verification/verify-serial                           │   │
│  │  Body: { serialNumber: "abc123..." }                            │   │
│  │                                                                  │   │
│  │  🔍 Backend Logic:                                               │   │
│  │  1. Query claimCodes collection                                 │   │
│  │  2. Check if code exists                                        │   │
│  │  3. Check if already claimed                                    │   │
│  │  4. Get product details                                         │   │
│  │  5. Return verification result + claimDate                      │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
                                    ↓ Response received
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                  VERIFICATION SUCCESSFUL                                │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  ✅ Frontend receives:                                           │   │
│  │  {                                                               │   │
│  │    verified: true,                                               │   │
│  │    claimed: false,                                               │   │
│  │    product: {...},                                               │   │
│  │    claimDate: "2026-02-04T11:34:54.000Z"                         │   │
│  │  }                                                               │   │
│  │                                                                  │   │
│  │  💾 Saves to localStorage:                                       │   │
│  │  crownmania_verified_serials = [                                │   │
│  │    {                                                             │   │
│  │      serialNumber: "abc123...",                                  │   │
│  │      verifiedAt: "2026-02-04T11:34:54.000Z",                     │   │
│  │      productId: "lil-durk-figure",                               │   │
│  │      source: "manual_entry"                                      │   │
│  │    }                                                             │   │
│  │  ]                                                               │   │
│  │                                                                  │   │
│  │  🎨 Triggers React state update:                                 │   │
│  │  setVerificationResult({...})                                    │   │
│  │  setIsPersistentlyVerified(true)                                 │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
                                    ↓ isAssetVerified becomes TRUE
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    🌈 VISUAL TRANSFORMATION                             │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  🎨 Vault UI: SMOOTH TRANSITION (1.5 seconds)                    │   │
│  │                                                                  │   │
│  │  FROM: filter: grayscale(100%) brightness(0.7)                  │   │
│  │  TO:   filter: grayscale(0%) brightness(1) saturate(1.1)        │   │
│  │                                                                  │   │
│  │  Animation: cubic-bezier(0.16, 1, 0.3, 1)                       │   │
│  │                                                                  │   │
│  │  🔓 Status: "ASSET VERIFIED" ✅                                  │   │
│  │  📅 Verified On: "Feb 4, 2026 at 6:34 PM"                        │   │
│  │  🎭 Mood: Vibrant, colorful, unlocked, OWNED                     │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
                                    ↓ User connects wallet (optional)
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                      WALLET CONNECTION                                  │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  🔐 Web3Auth Login Flow:                                         │   │
│  │  1. User clicks "CONNECT"                                        │   │
│  │  2. Web3Auth modal opens                                         │   │
│  │  3. User signs in (Google/Email/etc.)                            │   │
│  │  4. Embedded wallet created                                      │   │
│  │  5. Wallet address returned: 0x...                               │   │
│  │                                                                  │   │
│  │  📡 Frontend → Backend:                                          │   │
│  │  GET /api/verification/wallet-tokens/0x...                       │   │
│  │                                                                  │   │
│  │  📊 Backend returns owned tokens (if any)                        │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
                                    ↓ User claims NFT
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                        NFT CLAIM FLOW                                   │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  📱 Frontend → Backend:                                          │   │
│  │  POST /api/verification/claim                                    │   │
│  │  {                                                               │   │
│  │    productId: "abc123...",                                       │   │
│  │    walletAddress: "0x...",                                       │   │
│  │    signature: "...",                                             │   │
│  │    message: "..."                                                │   │
│  │  }                                                               │   │
│  │                                                                  │   │
│  │  🔒 Backend Atomic Transaction:                                  │   │
│  │  ┌────────────────────────────────────────────────────────────┐  │   │
│  │  │ 1. Verify code not claimed                                 │  │   │
│  │  │ 2. Get next edition number (1-500)                         │  │   │
│  │  │ 3. Create collectible record                               │  │   │
│  │  │ 4. Mark claim code as claimed                              │  │   │
│  │  │ 5. COMMIT transaction                                      │  │   │
│  │  └────────────────────────────────────────────────────────────┘  │   │
│  │                                                                  │   │
│  │  🎟️ Collectible Created:                                        │   │
│  │  {                                                               │   │
│  │    serialNumber: "abc123...",                                    │   │
│  │    productId: "lil-durk-figure",                                 │   │
│  │    ownerId: "0x...",                                             │   │
│  │    status: "claimed",                                            │   │
│  │    edition: 42,                                                  │   │
│  │    totalEditions: 500,                                           │   │
│  │    nftTransferred: false,  ← Initially false                    │   │
│  │    createdAt: Timestamp                                          │   │
│  │  }                                                               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
                                    ↓ Transaction committed
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                     NFT TRANSFER ATTEMPT                                │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  🎨 Backend → Thirdweb Engine:                                   │   │
│  │  POST /contract/137/{CONTRACT}/erc721/transfer                  │   │
│  │  {                                                               │   │
│  │    to: "0x...",      ← User's wallet                             │   │
│  │    tokenId: "42"     ← Assigned edition                          │   │
│  │  }                                                               │   │
│  │                                                                  │   │
│  │  ✅ SUCCESS PATH:                                                │   │
│  │  ┌────────────────────────────────────────────────────────────┐  │   │
│  │  │ 1. Transfer completes                                      │  │   │
│  │  │ 2. Get transaction hash                                    │  │   │
│  │  │ 3. Update collectible:                                     │  │   │
│  │  │    nftTransferred: true                                    │  │   │
│  │  │    transactionHash: "0x..."                                │  │   │
│  │  │    contractAddress: "0x..."                                │  │   │
│  │  │ 4. Send confirmation email                                 │  │   │
│  │  └────────────────────────────────────────────────────────────┘  │   │
│  │                                                                  │   │
│  │  ❌ FAILURE PATH:                                                │   │
│  │  ┌────────────────────────────────────────────────────────────┐  │   │
│  │  │ 1. Transfer fails (timeout, rate limit, etc.)             │  │   │
│  │  │ 2. Update collectible:                                     │  │   │
│  │  │    nftTransferred: false                                   │  │   │
│  │  │    nftTransferError: "Error message"                       │  │   │
│  │  │    retryCount: 0                                           │  │   │
│  │  │ 3. Claim still succeeds (user owns it)                     │  │   │
│  │  │ 4. Retry service will handle later                         │  │   │
│  │  └────────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
                                    ↓ If failed, retry service kicks in
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    NFT RETRY SERVICE (Every 15 min)                     │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  🔄 Automatic Recovery Process:                                  │   │
│  │                                                                  │   │
│  │  1. Query: nftTransferred == false && status == "claimed"       │   │
│  │  2. For each pending transfer:                                  │   │
│  │     ┌──────────────────────────────────────────────────────┐    │   │
│  │     │ a. Attempt transfer again                            │    │   │
│  │     │ b. If success:                                       │    │   │
│  │     │    - Update nftTransferred: true                     │    │   │
│  │     │    - Save transaction hash                           │    │   │
│  │     │    - Increment retryCount                            │    │   │
│  │     │ c. If failure:                                       │    │   │
│  │     │    - Increment retryCount                            │    │   │
│  │     │    - Save error message                              │    │   │
│  │     │    - If retryCount > 3: Send admin alert            │    │   │
│  │     └──────────────────────────────────────────────────────┘    │   │
│  │  3. Return summary: { attempted, succeeded, failed }            │   │
│  │                                                                  │   │
│  │  📧 Admin Alert (if 3+ failures):                                │   │
│  │  "CRITICAL: NFT transfer failed 3 times                          │   │
│  │   CollectibleID: abc123...                                       │   │
│  │   Owner: 0x...                                                   │   │
│  │   Error: Thirdweb Engine timeout"                                │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
                                    ↓ User returns days later
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    RETURNING USER EXPERIENCE                            │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  📱 User visits vault again                                      │   │
│  │                                                                  │   │
│  │  1. useEffect loads localStorage                                │   │
│  │  2. Finds verified serial in storage                            │   │
│  │  3. setIsPersistentlyVerified(true)                              │   │
│  │  4. setVerificationResult({...})                                 │   │
│  │                                                                  │   │
│  │  🎨 Vault: IMMEDIATELY COLORFUL (no API call needed)            │   │
│  │  📅 Verified On: Shows ORIGINAL verification date               │   │
│  │  🔓 Status: "ASSET VERIFIED"                                     │   │
│  │                                                                  │   │
│  │  💡 User experience:                                             │   │
│  │  "My vault remembers me! It's still unlocked and verified."     │   │
│  │                                                                  │   │
│  │  🔄 If user connects wallet:                                     │   │
│  │  - Fetch tokens from backend                                    │   │
│  │  - Merge with localStorage                                      │   │
│  │  - Show NFT in wallet if transfer succeeded                     │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
                                    ↓ 30 days later...
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    EXPIRY LOGIC (30 Day Default)                        │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  📅 Check localStorage age:                                      │   │
│  │                                                                  │   │
│  │  const age = now - new Date(item.verifiedAt).getTime();         │   │
│  │  const expiryMs = 30 * 24 * 60 * 60 * 1000; // 30 days          │   │
│  │                                                                  │   │
│  │  if (age < expiryMs) {                                           │   │
│  │    // Keep in localStorage                                      │   │
│  │    return true;                                                  │   │
│  │  } else {                                                        │   │
│  │    // Remove from localStorage                                  │   │
│  │    return false;                                                 │   │
│  │  }                                                               │   │
│  │                                                                  │   │
│  │  💡 Note: User can always:                                       │   │
│  │  - Re-scan QR to restore verification                           │   │
│  │  - Connect wallet to see NFT ownership                          │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘

## 🎯 Key Takeaways

1. **Visual Feedback is Instant**: Vault changes color immediately upon verification
2. **Persistence Works**: LocalStorage keeps state for 30 days without server calls
3. **NFT Transfer is Resilient**: Failed transfers auto-retry, don't break user flow
4. **Date Tracking is Accurate**: claimDate/verifiedAt always returned and stored
5. **Backend-Frontend Sync**: Data format consistent across all API endpoints

## 🔑 Critical State Variables

**Frontend:**
- `isAssetVerified` - Determines if vault is colorful
- `verificationResult` - Current verification data
- `isPersistentlyVerified` - Loaded from localStorage
- `verifiedSerials` - Array of verified items in localStorage

**Backend (Firestore):**
- `collectibles.nftTransferred` - Boolean transfer status
- `collectibles.retryCount` - Transfer retry attempts
- `claimCodes.claimed` - Prevents duplicate claims

**Visual CSS:**
- `filter: grayscale(100%)` → Locked state
- `filter: grayscale(0%) saturate(1.1)` → Unlocked state
- `transition: all 1.5s cubic-bezier(...)` → Smooth animation
```
