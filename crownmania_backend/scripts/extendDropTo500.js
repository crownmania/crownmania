/**
 * Extend the Lil Durk drop to the advertised 500 editions.
 *
 * On-chain reality before this: 400 tokens lazy-minted, claim condition
 * unlimited. This script:
 *   1. lazyMint(100, https://api.crownmania.com/api/metadata/) — tokens
 *      400-499 resolve to the backend metadata endpoint (route must be
 *      deployed first). Backend wallet is contract owner.
 *   2. Sets claim condition maxClaimableSupply = 480 remaining
 *      (20 already claimed under the current condition; the new
 *      condition's supplyClaimed counter starts at 0)
 *
 * Usage:
 *   node scripts/extendDropTo500.js          # dry run — prints plan
 *   node scripts/extendDropTo500.js --apply  # executes on-chain writes
 */

import '../src/env.js';
import { ThirdwebSDK } from '@thirdweb-dev/sdk';
import { ethers } from 'ethers';

const CONTRACT = process.env.THIRDWEB_NFT_CONTRACT || process.env.NFT_CONTRACT_ADDRESS;
const PRIVATE_KEY = process.env.MINTING_WALLET_PRIVATE_KEY || process.env.BACKEND_WALLET_PRIVATE_KEY;
const SECRET_KEY = process.env.THIRDWEB_SECRET_KEY;
const RPC = process.env.ALCHEMY_RPC_URL || 'https://polygon-bor-rpc.publicnode.com';
const METADATA_BASE = 'https://api.crownmania.com/api/metadata/';
const APPLY = process.argv.includes('--apply');

const TARGET_SUPPLY = 500;

async function main() {
  if (!CONTRACT || !PRIVATE_KEY || !SECRET_KEY) {
    throw new Error('Need THIRDWEB_NFT_CONTRACT, MINTING_WALLET_PRIVATE_KEY and THIRDWEB_SECRET_KEY');
  }

  const provider = new ethers.providers.JsonRpcProvider(RPC);
  const ro = new ethers.Contract(CONTRACT, [
    'function nextTokenIdToMint() view returns (uint256)',
    'function nextTokenIdToClaim() view returns (uint256)',
    'function getActiveClaimConditionId() view returns (uint256)',
    'function getClaimConditionById(uint256) view returns (tuple(uint256 startTimestamp, uint256 maxClaimableSupply, uint256 supplyClaimed, uint256 quantityLimitPerWallet, bytes32 merkleRoot, uint256 pricePerToken, address currency, string metadata))'
  ], provider);

  const minted = (await ro.nextTokenIdToMint()).toNumber();
  const claimed = (await ro.nextTokenIdToClaim()).toNumber();
  const cond = await ro.getClaimConditionById(await ro.getActiveClaimConditionId());

  const toMint = TARGET_SUPPLY - minted;
  const remainingCap = TARGET_SUPPLY - claimed;

  console.log(`Contract: ${CONTRACT}`);
  console.log(`Lazy-minted supply: ${minted} | claimed: ${claimed}`);
  console.log(`Current condition: max=${cond.maxClaimableSupply.toString().slice(0, 30)}, claimed=${cond.supplyClaimed.toString()}, price=${ethers.utils.formatEther(cond.pricePerToken)}, perWallet=${cond.quantityLimitPerWallet.toString().slice(0, 20)}`);
  console.log(`\nPlan: lazyMint ${toMint} tokens (${minted}-${TARGET_SUPPLY - 1}) via ${METADATA_BASE}, cap claims at ${remainingCap} remaining (= ${TARGET_SUPPLY} total)`);

  if (toMint <= 0) {
    console.log('Supply already at target — only the claim-condition cap is needed.');
  }

  if (!APPLY) {
    console.log('\nDRY RUN — pass --apply to execute on-chain writes.');
    return;
  }

  const sdk = ThirdwebSDK.fromPrivateKey(PRIVATE_KEY, 'polygon', { secretKey: SECRET_KEY });
  const contract = await sdk.getContract(CONTRACT);

  if (toMint > 0) {
    console.log(`\nlazyMint(${toMint}) with baseURI ${METADATA_BASE}...`);
    const tx = await contract.call('lazyMint', [toMint, METADATA_BASE, '0x']);
    console.log(`lazyMint tx: ${tx.receipt.transactionHash}`);
  }

  console.log(`Setting claim condition: maxClaimableSupply=${remainingCap}...`);
  const setTx = await contract.erc721.claimConditions.set([{
    startTimestamp: cond.startTimestamp.toNumber(),
    maxClaimableSupply: remainingCap.toString(),
    quantityLimitPerWallet: 'unlimited',
    price: '0',
    currencyAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
  }]);
  console.log(`setClaimConditions tx: ${setTx.receipt.transactionHash}`);

  const after = (await ro.nextTokenIdToMint()).toNumber();
  const newCond = await ro.getClaimConditionById(await ro.getActiveClaimConditionId());
  const tokenURI = await new ethers.Contract(CONTRACT, ['function tokenURI(uint256) view returns (string)'], provider).tokenURI(TARGET_SUPPLY - 1);
  console.log(`\nVerified: lazy-minted supply=${after}, condition max=${newCond.maxClaimableSupply.toString()}, tokenURI(499)=${tokenURI}`);
}

main().catch(err => { console.error('Failed:', err.message); process.exit(1); });
