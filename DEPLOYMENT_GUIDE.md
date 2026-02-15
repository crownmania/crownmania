# 🚀 CrownMania Deployment Guide

## Status: Ready for Testnet Deployment

### Pre-Deployment Checklist

| # | Task | Status |
|---|------|--------|
| 1 | Smart contract compiled | ✅ |
| 2 | Unit tests passing (17/17) | ✅ |
| 3 | E2E claim flow tests passing (16/16) | ✅ |
| 4 | Backend test suite passing (141/141) | ✅ |
| 5 | Security audit complete | ✅ |
| 6 | All TODOs resolved | ✅ |
| 7 | Console.log replaced with structured logger | ✅ |
| 8 | Math.random replaced with crypto.randomInt | ✅ |
| 9 | Mumbai → Amoy testnet migration | ✅ |

---

## Step 1: Deploy Smart Contract to Polygon Amoy Testnet

### 1a. Create Deployer Wallet

You need a fresh wallet for the backend (deployer). **Never use your personal wallet.**

```bash
# Generate a new wallet (inside the smart-contracts directory)
cd smart-contracts
node -e "const w = require('ethers').Wallet.createRandom(); console.log('Address:', w.address); console.log('Private Key:', w.privateKey)"
```

Save the **address** and **private key** securely.

### 1b. Get Alchemy API Key

1. Go to [dashboard.alchemy.com](https://dashboard.alchemy.com)
2. Create a new app → Select "Polygon Amoy" network
3. Copy the API key

### 1c. Get Test POL (MATIC) from Faucet

1. Go to [faucet.polygon.technology](https://faucet.polygon.technology/)
2. Select "Polygon Amoy" network
3. Paste your deployer wallet address
4. Request test POL (you need ~0.5 POL for deployment + minting)

Alternative faucets:
- [alchemy.com/faucets/polygon-amoy](https://www.alchemy.com/faucets/polygon-amoy)

### 1d. Configure Environment

```bash
cd smart-contracts
cp .env.example .env
```

Edit `.env`:
```bash
ALCHEMY_API_KEY=your-key-here
ALCHEMY_AMOY_URL=https://polygon-amoy.g.alchemy.com/v2/your-key-here
DEPLOYER_PRIVATE_KEY=your-64-char-hex-private-key-without-0x
```

### 1e. Deploy

```bash
npm run deploy:amoy
```

This will:
1. Deploy `CrownManiaNFT` contract
2. Pre-mint all 500 editions in batches of 50
3. Attempt to verify on Polygonscan
4. Save deployment info to `deployment.json`

### 1f. Save Contract Address

After deployment, copy the contract address from `deployment.json` into your backend `.env`:

```bash
THIRDWEB_NFT_CONTRACT=0x...your-deployed-contract-address
NFT_OWNER_WALLET=0x...your-deployer-wallet-address
```

---

## Step 2: Update Backend for Amoy Testnet

In `crownmania_backend/.env`:
```bash
POLYGON_CHAIN_ID=80002
ALCHEMY_POLYGON_URL=https://polygon-amoy.g.alchemy.com/v2/your-key
THIRDWEB_NFT_CONTRACT=0x...from-deployment.json
NFT_OWNER_WALLET=0x...your-deployer-address
```

---

## Step 3: Test E2E Claim Flow

1. Start the backend: `cd crownmania_backend && npm run dev`
2. Start the frontend: `cd crownmania_frontend && npm run dev`
3. Open the app → Navigate to Verify page
4. Enter a test serial number from your Firestore `claimCodes` collection
5. Connect wallet via Web3Auth
6. Sign the nonce message
7. Click "Claim" → Should transfer NFT
8. Check Vault → Edition should appear
9. Verify on [amoy.polygonscan.com](https://amoy.polygonscan.com) that the NFT transferred

---

## Step 4: Production Deployment (Polygon Mainnet)

When ready for production:

1. Fund deployer wallet with real POL/MATIC on Polygon mainnet
2. Set `ALCHEMY_POLYGON_URL` to mainnet RPC
3. Run `npm run deploy:polygon`
4. Update backend `.env` with mainnet contract address
5. Set `POLYGON_CHAIN_ID=137` in backend

**Estimated total cost for 500 editions on Polygon mainnet: ~$5-10**

---

## Architecture Summary

```
User scans QR → /verify?code=ABC123
    ↓
POST /api/verification/verify
    → Firestore: checks claimCodes collection
    → Returns: { verified: true, product: {...} }
    ↓
User clicks "Claim" → Web3Auth login
    ↓
GET /api/auth/nonce?address=0x...
    → Firestore: creates nonce with 5min TTL
    ↓
User signs message in wallet
    ↓
POST /api/verification/claim
    → Verify signature (ecrecover)
    → Verify nonce hasn't expired
    → Firestore transaction:
        - Mark claimCode as claimed
        - Increment edition counter
        - Create collectible record
    → Enqueue NFT transfer job (BullMQ)
    ↓
Transfer Worker processes job
    → Calls contract.transferEdition(userWallet, tokenId)
    → Waits for on-chain confirmation
    → Updates collectible status → 'active'
    → Sends claim confirmation email
    ↓
User sees NFT in Vault
    → On-chain ownership verified
    → Metadata URI resolves to edition details
```
