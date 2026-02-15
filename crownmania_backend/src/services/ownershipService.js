import Moralis from 'moralis';
import logger from '../config/logger.js';

let moralisInitialized = false;

/**
 * Initialize Moralis SDK
 */
const initMoralis = async () => {
    if (moralisInitialized) return;

    try {
        if (!process.env.MORALIS_API_KEY) {
            logger.warn('MORALIS_API_KEY not set. Ownership verification will fail.');
            return;
        }

        await Moralis.start({
            apiKey: process.env.MORALIS_API_KEY
        });

        moralisInitialized = true;
        logger.info('Moralis initialized successfully');
    } catch (error) {
        logger.error('Error initializing Moralis:', error);
        throw error;
    }
};

/**
 * Service for verifying NFT ownership on-chain
 * Uses Moralis API for blockchain queries
 */
export const ownershipService = {
    /**
     * Check who owns a specific NFT on-chain
     * @param {string} contractAddress - The NFT contract address
     * @param {string} tokenId - The token ID
     * @param {string} chain - Chain identifier (default: base)
     * @returns {Promise<string>} Owner wallet address (lowercase)
     */
    checkNFTOwnership: async (contractAddress, tokenId, chain = 'base') => {
        try {
            await initMoralis();

            if (!moralisInitialized) {
                throw new Error('Moralis not initialized');
            }

            const response = await Moralis.EvmApi.nft.getNFTOwners({
                address: contractAddress,
                chain,
                tokenId
            });

            if (!response.result || response.result.length === 0) {
                throw new Error('NFT not found or has no owner');
            }

            const owner = response.result[0].owner_of;
            logger.info(`NFT ${tokenId} owned by ${owner.substring(0, 10)}...`);

            return owner.toLowerCase();
        } catch (error) {
            logger.error('Error checking NFT ownership:', error);
            throw error;
        }
    },

    /**
     * Get all NFTs owned by a wallet address
     * @param {string} walletAddress - The wallet address
     * @param {string} contractAddress - Optional: filter by contract
     * @param {string} chain - Chain identifier (default: base)
     * @returns {Promise<Array>} Array of NFT objects
     */
    getWalletNFTs: async (walletAddress, contractAddress = null, chain = 'base') => {
        try {
            await initMoralis();

            if (!moralisInitialized) {
                throw new Error('Moralis not initialized');
            }

            const params = {
                address: walletAddress,
                chain
            };

            if (contractAddress) {
                params.tokenAddresses = [contractAddress];
            }

            const response = await Moralis.EvmApi.nft.getWalletNFTs(params);

            const nfts = response.result.map(nft => ({
                tokenId: nft.token_id,
                contractAddress: nft.token_address,
                tokenUri: nft.token_uri,
                metadata: nft.metadata ? JSON.parse(nft.metadata) : null,
                name: nft.name,
                symbol: nft.symbol
            }));

            logger.info(`Found ${nfts.length} NFTs for wallet ${walletAddress.substring(0, 10)}...`);

            return nfts;
        } catch (error) {
            logger.error('Error getting wallet NFTs:', error);
            throw error;
        }
    },

    /**
     * Verify that a wallet owns a specific NFT
     * @param {string} walletAddress - The wallet address to verify
     * @param {string} contractAddress - The NFT contract address
     * @param {string} tokenId - The token ID
     * @param {string} chain - Chain identifier (default: base)
     * @returns {Promise<boolean>} True if wallet owns the NFT
     */
    verifyOwnership: async (walletAddress, contractAddress, tokenId, chain = 'base') => {
        try {
            const owner = await ownershipService.checkNFTOwnership(contractAddress, tokenId, chain);
            const owns = owner.toLowerCase() === walletAddress.toLowerCase();

            logger.info(`Ownership verification: ${walletAddress.substring(0, 10)}... ${owns ? 'owns' : 'does not own'} token ${tokenId}`);

            return owns;
        } catch (error) {
            logger.error('Error verifying ownership:', error);
            return false;
        }
    }
};

export default ownershipService;
