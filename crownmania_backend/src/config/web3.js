import Moralis from 'moralis';
import { ethers } from 'ethers';

// Initialize Moralis
await Moralis.start({
  apiKey: process.env.MORALIS_API_KEY
});

// Initialize ethers provider - Polygon (chainId 137)
const provider = new ethers.JsonRpcProvider(
  process.env.ALCHEMY_RPC_URL ||
  process.env.WEB3_RPC_URL ||
  'https://polygon-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY
);

// Chain configuration
const chainConfig = {
  chainId: parseInt(process.env.POLYGON_CHAIN_ID || '137'),
  name: 'Polygon',
  rpcUrl: process.env.ALCHEMY_RPC_URL || process.env.WEB3_RPC_URL,
};

// Contract addresses
const contractAddresses = {
  nft: process.env.NFT_CONTRACT_ADDRESS,
};

// CrownManiaNFT ABI (minimal for backend operations)
const contractABIs = {
  nft: [
    'function transferFrom(address from, address to, uint256 tokenId) public',
    'function transferEdition(address to, uint256 tokenId) external',
    'function ownerOf(uint256 tokenId) public view returns (address)',
    'function balanceOf(address owner) public view returns (uint256)',
    'function tokenURI(uint256 tokenId) public view returns (string)',
    'function totalMinted() public view returns (uint256)',
    'function MAX_SUPPLY() public view returns (uint256)',
  ],
};

export {
  Moralis,
  provider,
  chainConfig,
  contractAddresses,
  contractABIs
};
