/**
 * Crownmania On-Chain Token ID Checker
 *
 * Verifies which token IDs the NFT owner wallet actually holds on the contract.
 * This determines whether the claim flow's edition->tokenId mapping is correct
 * (editions start at 1; many contracts mint token IDs starting at 0).
 *
 * Read-only: uses public RPC, no private keys required.
 *
 * Usage:
 *   node scripts/checkTokenIds.js [maxTokenId]
 *
 * Env (optional):
 *   NFT_CONTRACT_ADDRESS  - defaults to the production contract
 *   NFT_OWNER_WALLET      - defaults to the production owner wallet
 *   ALCHEMY_RPC_URL       - defaults to the public Polygon RPC
 */

import '../src/env.js';
import { ethers } from 'ethers';

const CONTRACT_ADDRESS = process.env.NFT_CONTRACT_ADDRESS || '0x4785DBa85de01B0DB84269F3fd471dDd8461623C';
const OWNER_WALLET = (process.env.NFT_OWNER_WALLET || '0x40b3fce398fecb3c002b7a71c1a576106e6a8a1b').toLowerCase();
const RPC_URL = process.env.ALCHEMY_RPC_URL || process.env.ALCHEMY_POLYGON_URL || 'https://polygon-rpc.com';
const MAX_TOKEN_ID = parseInt(process.argv[2] || '520', 10);

const abi = [
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function balanceOf(address owner) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function name() view returns (string)',
  'function symbol() view returns (string)'
];

async function main() {
  console.log('🔍 Crownmania On-Chain Token Checker');
  console.log(`   Contract: ${CONTRACT_ADDRESS}`);
  console.log(`   Owner wallet: ${OWNER_WALLET}`);
  console.log(`   RPC: ${RPC_URL}`);
  console.log('');

  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);

  // Basic contract info
  try {
    const [name, symbol] = await Promise.all([contract.name(), contract.symbol()]);
    console.log(`📛 Contract: ${name} (${symbol})`);
  } catch {
    console.log('📛 Contract name/symbol not readable (may be a proxy)');
  }

  try {
    const supply = await contract.totalSupply();
    console.log(`📦 totalSupply: ${supply.toString()}`);
  } catch {
    console.log('📦 totalSupply() not available on this contract');
  }

  try {
    const balance = await contract.balanceOf(OWNER_WALLET);
    console.log(`👛 Owner wallet balance: ${balance.toString()} tokens`);
  } catch (e) {
    console.log(`👛 balanceOf failed: ${e.message}`);
  }

  console.log('');
  console.log(`🔎 Probing ownerOf for token IDs 0..${MAX_TOKEN_ID} (batches of 25)...`);

  const ownedIds = [];
  const otherOwners = new Map(); // tokenId -> owner (tokens that exist but aren't held by owner wallet)
  let nonexistent = 0;

  for (let start = 0; start <= MAX_TOKEN_ID; start += 25) {
    const end = Math.min(start + 24, MAX_TOKEN_ID);
    const ids = [];
    for (let i = start; i <= end; i++) ids.push(i);

    const results = await Promise.allSettled(ids.map((id) => contract.ownerOf(id)));

    results.forEach((res, idx) => {
      const tokenId = ids[idx];
      if (res.status === 'fulfilled') {
        const owner = res.value.toLowerCase();
        if (owner === OWNER_WALLET) {
          ownedIds.push(tokenId);
        } else {
          otherOwners.set(tokenId, owner);
        }
      } else {
        nonexistent++;
      }
    });

    process.stdout.write(`\r   Checked 0..${end} | owned so far: ${ownedIds.length}`);
  }

  console.log('\n');
  console.log('===============================================');
  console.log('📊 RESULTS');
  console.log('===============================================');
  console.log(`✅ Token IDs held by owner wallet: ${ownedIds.length}`);
  if (ownedIds.length > 0) {
    console.log(`   Lowest ID:  ${ownedIds[0]}`);
    console.log(`   Highest ID: ${ownedIds[ownedIds.length - 1]}`);
    const preview = ownedIds.slice(0, 10).join(', ');
    console.log(`   First 10: ${preview}`);
  }
  console.log(`👥 Tokens existing but held by OTHER wallets: ${otherOwners.size}`);
  if (otherOwners.size > 0 && otherOwners.size <= 20) {
    for (const [id, owner] of otherOwners) {
      console.log(`   Token ${id} -> ${owner}`);
    }
  }
  console.log(`🚫 Nonexistent/unreadable token IDs in range: ${nonexistent}`);
  console.log('');

  // Recommendation for the claim flow mapping
  if (ownedIds.length > 0) {
    const lowest = ownedIds[0];
    console.log('===============================================');
    console.log('🧭 CLAIM FLOW MAPPING RECOMMENDATION');
    console.log('===============================================');
    console.log('The claim flow maps: blockchainTokenId = editionNumber + NFT_TOKEN_ID_OFFSET');
    console.log('Editions start at 1.');
    if (lowest === 0) {
      console.log('➡️  Tokens are 0-indexed. Set NFT_TOKEN_ID_OFFSET=-1 on the backend.');
      console.log('    (edition 1 -> token 0, edition 500 -> token 499)');
    } else if (lowest === 1) {
      console.log('➡️  Tokens are 1-indexed. Set NFT_TOKEN_ID_OFFSET=0 (or leave unset).');
      console.log('    (edition 1 -> token 1, edition 500 -> token 500)');
    } else {
      console.log(`➡️  Tokens start at ${lowest}. Set NFT_TOKEN_ID_OFFSET=${lowest - 1}.`);
      console.log(`    (edition 1 -> token ${lowest})`);
    }
  } else {
    console.log('⚠️  Owner wallet holds NO tokens in the probed range.');
    console.log('    Either the range is wrong (pass a larger maxTokenId), the owner');
    console.log('    wallet is different, or the NFTs were not pre-minted.');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Check failed:', err.message);
  process.exit(1);
});
