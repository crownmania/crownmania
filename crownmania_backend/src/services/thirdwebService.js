// Thirdweb NFT Transfer Service
// For transferring pre-minted NFTs using Thirdweb Engine API
import { ThirdwebSDK } from "@thirdweb-dev/sdk";

const POLYGON_CHAIN_ID = "137";

// Transfer NFT using Thirdweb Engine API (for managed wallets)
export const transferNFTToWallet = async (recipientWallet, tokenId = null) => {
    try {
        const contractAddress = process.env.THIRDWEB_NFT_CONTRACT;
        const secretKey = process.env.THIRDWEB_SECRET_KEY;
        const ownerWallet = process.env.NFT_OWNER_WALLET;

        if (!contractAddress || !secretKey) {
            throw new Error('THIRDWEB_NFT_CONTRACT or THIRDWEB_SECRET_KEY not configured');
        }

        // Use Thirdweb Engine API for backend transactions
        // Engine URL: https://engine.thirdweb.com or your self-hosted instance
        const engineUrl = process.env.THIRDWEB_ENGINE_URL || 'https://engine.thirdweb.com';
        const engineAccessToken = process.env.THIRDWEB_ENGINE_ACCESS_TOKEN;

        // If no token ID specified, get the first available one
        if (!tokenId) {
            const available = await getAvailableNFTs();
            if (available.length === 0) {
                throw new Error('No NFTs available for claiming');
            }
            tokenId = available[0].tokenId;
        }

        console.log(`Transferring NFT token ${tokenId} to wallet ${recipientWallet}`);

        // If we have Engine access token, use Engine API
        if (engineAccessToken) {
            const response = await fetch(`${engineUrl}/contract/${POLYGON_CHAIN_ID}/${contractAddress}/erc721/transfer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${engineAccessToken}`,
                    'x-backend-wallet-address': ownerWallet
                },
                body: JSON.stringify({
                    to: recipientWallet,
                    tokenId: tokenId.toString()
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Engine API transfer failed');
            }

            const result = await response.json();
            console.log('NFT transferred via Engine:', result);

            return {
                success: true,
                transactionHash: result.result?.transactionHash || result.transactionHash,
                tokenId: tokenId.toString(),
                contractAddress: contractAddress,
                recipient: recipientWallet,
                method: 'engine'
            };
        }

        // Fallback: Use SDK with private key if available
        const privateKey = process.env.MINTING_WALLET_PRIVATE_KEY;
        if (privateKey) {
            const sdk = ThirdwebSDK.fromPrivateKey(privateKey, "polygon", { secretKey });
            const contract = await sdk.getContract(contractAddress);
            const tx = await contract.erc721.transfer(recipientWallet, tokenId);

            return {
                success: true,
                transactionHash: tx.receipt?.transactionHash,
                tokenId: tokenId.toString(),
                contractAddress: contractAddress,
                recipient: recipientWallet,
                method: 'sdk'
            };
        }

        throw new Error('No transfer method available - configure THIRDWEB_ENGINE_ACCESS_TOKEN or MINTING_WALLET_PRIVATE_KEY');
    } catch (error) {
        console.error('Error transferring NFT:', error);
        throw new Error(`Failed to transfer NFT: ${error.message}`);
    }
};

// Get available (unclaimed) NFTs from the collection using read-only SDK
export const getAvailableNFTs = async () => {
    try {
        const contractAddress = process.env.THIRDWEB_NFT_CONTRACT;
        const ownerWallet = process.env.NFT_OWNER_WALLET;
        const secretKey = process.env.THIRDWEB_SECRET_KEY;

        if (!secretKey || !contractAddress || !ownerWallet) {
            console.warn('Missing Thirdweb config for getAvailableNFTs');
            return [];
        }

        // Use read-only SDK
        const sdk = new ThirdwebSDK("polygon", { secretKey });
        const contract = await sdk.getContract(contractAddress);

        // Get all NFTs owned by the owner wallet (these are available for claiming)
        const ownedTokens = await contract.erc721.getOwned(ownerWallet);

        return ownedTokens.map(t => ({
            tokenId: t.metadata.id,
            name: t.metadata.name,
            image: t.metadata.image,
            description: t.metadata.description
        }));
    } catch (error) {
        console.error('Error getting available NFTs:', error);
        return [];
    }
};

// Check if user already owns an NFT from this collection
export const checkNFTOwnership = async (walletAddress) => {
    try {
        const contractAddress = process.env.THIRDWEB_NFT_CONTRACT;
        const secretKey = process.env.THIRDWEB_SECRET_KEY;

        if (!secretKey || !contractAddress) {
            return { owned: false, tokens: [] };
        }

        const sdk = new ThirdwebSDK("polygon", { secretKey });
        const contract = await sdk.getContract(contractAddress);
        const ownedTokens = await contract.erc721.getOwned(walletAddress);

        return {
            owned: ownedTokens.length > 0,
            tokens: ownedTokens.map(t => ({
                tokenId: t.metadata.id,
                name: t.metadata.name,
                image: t.metadata.image
            }))
        };
    } catch (error) {
        console.error('Error checking NFT ownership:', error);
        return { owned: false, tokens: [] };
    }
};

// Get NFT metadata by token ID
export const getNFTMetadata = async (tokenId) => {
    try {
        const contractAddress = process.env.THIRDWEB_NFT_CONTRACT;
        const secretKey = process.env.THIRDWEB_SECRET_KEY;

        if (!secretKey || !contractAddress) {
            return null;
        }

        const sdk = new ThirdwebSDK("polygon", { secretKey });
        const contract = await sdk.getContract(contractAddress);
        const nft = await contract.erc721.get(tokenId);

        return {
            tokenId: nft.metadata.id,
            name: nft.metadata.name,
            description: nft.metadata.description,
            image: nft.metadata.image,
            owner: nft.owner
        };
    } catch (error) {
        console.error('Error getting NFT metadata:', error);
        return null;
    }
};

export default {
    transferNFTToWallet,
    getAvailableNFTs,
    checkNFTOwnership,
    getNFTMetadata
};
