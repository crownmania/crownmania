import Moralis from 'moralis';
import { ethers } from 'ethers';

// Initialize Moralis
await Moralis.start({
  apiKey: process.env.MORALIS_API_KEY
});

// Initialize ethers provider
const provider = new ethers.JsonRpcProvider(process.env.WEB3_RPC_URL);

// Contract addresses
const contractAddresses = {
  nft: process.env.NFT_CONTRACT_ADDRESS,
  marketplace: process.env.MARKETPLACE_CONTRACT_ADDRESS
};

// ABI imports (to be added when contracts are compiled)
const contractABIs = {
  nft: [],
  marketplace: []
};
export { Moralis, provider, contractAddresses, contractABIs };