/**
 * Probe the Thirdweb Drop contract state (read-only, public RPC).
 * Determines whether tokens are lazy-minted (Drop-style) vs pre-minted ERC721.
 *
 * Usage: node scripts/checkDropContract.js
 */

import '../src/env.js';
import { ethers } from 'ethers';

const CONTRACT_ADDRESS = process.env.NFT_CONTRACT_ADDRESS || '0x4785DBa85de01B0DB84269F3fd471dDd8461623C';
const RPC_URL = process.env.ALCHEMY_RPC_URL || 'https://polygon-bor-rpc.publicnode.com';

const abi = [
  'function contractType() pure returns (bytes32)',
  'function nextTokenIdToMint() view returns (uint256)',
  'function nextTokenIdToClaim() view returns (uint256)',
  'function owner() view returns (address)',
  'function name() view returns (string)',
  'function totalSupply() view returns (uint256)'
];

// Hard timeout so the script never hangs
const timeout = setTimeout(() => {
  console.error('⏱️  Timed out after 60s');
  process.exit(2);
}, 60000);

async function probe(label, fn) {
  try {
    const result = await fn();
    console.log(`${label}: ${result}`);
  } catch (e) {
    console.log(`${label}: n/a (${e.reason || e.code || e.message})`);
  }
}

async function main() {
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  console.log(`RPC: ${RPC_URL}\n`);

  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const c = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);

  await probe('name', async () => await c.name());
  await probe('contractType', async () => ethers.utils.parseBytes32String(await c.contractType()));
  await probe('totalSupply (minted so far)', async () => (await c.totalSupply()).toString());
  await probe('nextTokenIdToMint (lazy-minted metadata count)', async () => (await c.nextTokenIdToMint()).toString());
  await probe('nextTokenIdToClaim (next unclaimed token)', async () => (await c.nextTokenIdToClaim()).toString());
  await probe('contract owner', async () => await c.owner());

  clearTimeout(timeout);
  process.exit(0);
}

main().catch((e) => {
  console.error('Failed:', e.message);
  process.exit(1);
});
