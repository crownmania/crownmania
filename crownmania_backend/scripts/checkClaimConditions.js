/**
 * Probe DropERC721 claim conditions + backend wallet gas balance (read-only).
 *
 * Usage: node scripts/checkClaimConditions.js
 */

import '../src/env.js';
import { ethers } from 'ethers';

const CONTRACT_ADDRESS = process.env.NFT_CONTRACT_ADDRESS || '0x4785DBa85de01B0DB84269F3fd471dDd8461623C';
const OWNER_WALLET = process.env.NFT_OWNER_WALLET || '0x40B3fcE398FeCB3c002b7a71C1A576106e6a8a1B';
const RPC_URL = process.env.ALCHEMY_RPC_URL || 'https://polygon-bor-rpc.publicnode.com';

const abi = [
  'function claimCondition() view returns (uint256 currentStartId, uint256 count)',
  'function getActiveClaimConditionId() view returns (uint256)',
  'function getClaimConditionById(uint256 conditionId) view returns (tuple(uint256 startTimestamp, uint256 maxClaimableSupply, uint256 supplyClaimed, uint256 quantityLimitPerWallet, bytes32 merkleRoot, uint256 pricePerToken, address currency, string metadata) condition)'
];

const timeout = setTimeout(() => {
  console.error('Timed out after 60s');
  process.exit(2);
}, 60000);

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const c = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);

  console.log(`Contract: ${CONTRACT_ADDRESS}\n`);

  // Backend wallet gas balance
  try {
    const bal = await provider.getBalance(OWNER_WALLET);
    console.log(`Backend wallet POL balance: ${ethers.utils.formatEther(bal)} POL`);
  } catch (e) {
    console.log(`Balance check failed: ${e.message}`);
  }

  // Claim condition overview
  try {
    const cc = await c.claimCondition();
    console.log(`claimCondition: startId=${cc.currentStartId.toString()}, count=${cc.count.toString()}`);
    if (cc.count.toNumber() === 0) {
      console.log('\n⚠️  NO CLAIM CONDITIONS SET — claim() will revert.');
      console.log('   A claim phase must be created in the Thirdweb dashboard.');
      clearTimeout(timeout);
      process.exit(0);
    }
  } catch (e) {
    console.log(`claimCondition: n/a (${e.reason || e.code || e.message})`);
  }

  try {
    const activeId = await c.getActiveClaimConditionId();
    console.log(`Active claim condition ID: ${activeId.toString()}`);

    const cond = await c.getClaimConditionById(activeId);
    console.log('\nActive claim condition details:');
    console.log(`  startTimestamp:        ${new Date(cond.startTimestamp.toNumber() * 1000).toISOString()}`);
    console.log(`  maxClaimableSupply:    ${cond.maxClaimableSupply.toString()}`);
    console.log(`  supplyClaimed:         ${cond.supplyClaimed.toString()}`);
    console.log(`  quantityLimitPerWallet:${cond.quantityLimitPerWallet.toString()}`);
    console.log(`  merkleRoot:            ${cond.merkleRoot}`);
    console.log(`  pricePerToken:         ${ethers.utils.formatEther(cond.pricePerToken)} (${cond.pricePerToken.toString()} wei)`);
    console.log(`  currency:              ${cond.currency}`);
    console.log(`  metadata:              ${cond.metadata}`);

    const isOpenAllowlist = cond.merkleRoot === '0x0000000000000000000000000000000000000000000000000000000000000000';
    console.log(`\n  Allowlist: ${isOpenAllowlist ? 'NONE (public claim)' : 'RESTRICTED (merkle allowlist set)'}`);
  } catch (e) {
    console.log(`Active condition read failed: ${e.reason || e.code || e.message}`);
  }

  clearTimeout(timeout);
  process.exit(0);
}

main().catch((e) => {
  console.error('Failed:', e.message);
  process.exit(1);
});
