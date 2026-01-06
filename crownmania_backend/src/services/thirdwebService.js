// Thirdweb NFT Transfer Service
// For transferring pre-minted NFTs to users on verification
import { ThirdwebSDK } from "@thirdweb-dev/sdk";

// Initialize Thirdweb SDK with secret key for backend operations
const getThirdwebSDK = () => {
    const secretKey = process.env.THIRDWEB_SECRET_KEY;
    const privateKey = process.env.MINTING_WALLET_PRIVATE_KEY;

    if (!secretKey) {
        console.error('THIRDWEB_SECRET_KEY not configured');
        return null;
    }

    if (!privateKey) {
        console.error('MINTING_WALLET_PRIVATE_KEY not configured - needed for transfers');
        return null;
    }

    // Initialize SDK for Polygon network with the wallet that owns the NFTs
    const sdk = ThirdwebSDK.fromPrivateKey(
        privateKey,
        "polygon",
        {
            secretKey: secretKey,
        }
    );

    return sdk;
};

// Get available (unclaimed) NFTs from the collection
export const getAvailableNFTs = async () => {
    try {
        const contractAddress = process.env.THIRDWEB_NFT_CONTRACT;
        const ownerWallet = process.env.NFT_OWNER_WALLET || process.env.MINTING_WALLET_ADDRESS;
        const sdk = getThirdwebSDK();

        if (!sdk || !contractAddress) {
            return [];
        }

        const contract = await sdk.getContract(contractAddress);

        // Get all NFTs owned by the minting/owner wallet (these are available for claiming)
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

// Transfer a pre-minted NFT to user's wallet
export const transferNFTToWallet = async (walletAddress, tokenId = null) => {
    try {
        const contractAddress = process.env.THIRDWEB_NFT_CONTRACT;

        if (!contractAddress) {
            throw new Error('THIRDWEB_NFT_CONTRACT not configured');
        }

        const sdk = getThirdwebSDK();
        if (!sdk) {
            throw new Error('Thirdweb SDK not initialized - check THIRDWEB_SECRET_KEY and MINTING_WALLET_PRIVATE_KEY');
        }

        const contract = await sdk.getContract(contractAddress);

        // If no specific token ID, get the first available one
        if (!tokenId) {
            const available = await getAvailableNFTs();
            if (available.length === 0) {
                throw new Error('No NFTs available for claiming');
            }
            tokenId = available[0].tokenId;
        }

        console.log(`Transferring NFT token ${tokenId} to wallet ${walletAddress}`);

        // Transfer the NFT to the user
        const tx = await contract.erc721.transfer(walletAddress, tokenId);

        console.log('NFT transferred successfully:', tx);

        return {
            success: true,
            transactionHash: tx.receipt?.transactionHash,
            tokenId: tokenId.toString(),
            contractAddress: contractAddress,
            recipient: walletAddress
        };
    } catch (error) {
        console.error('Error transferring NFT:', error);
        throw new Error(`Failed to transfer NFT: ${error.message}`);
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

        // Use read-only SDK for checking ownership
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
