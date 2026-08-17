// Thirdweb & Ethers NFT Transfer Service
// For transferring pre-minted NFTs using Thirdweb Engine API or Ethers.js
import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import { ethers } from "ethers";
import logger from '../config/logger.js';

const POLYGON_CHAIN_ID = process.env.POLYGON_CHAIN_ID || "137";
const IS_TESTNET = parseInt(POLYGON_CHAIN_ID) === 80002;
const SDK_NETWORK = IS_TESTNET ? "amoy" : "polygon";

// Claim (mint + send) NFT from DropERC721 lazy-mint contract
// This is the correct operation for lazy-mint drops where tokens don't exist until claimed
export const claimNFTToWallet = async (recipientWallet, quantity = 1) => {
    try {
        const contractAddress = process.env.THIRDWEB_NFT_CONTRACT || process.env.NFT_CONTRACT_ADDRESS;
        const secretKey = process.env.THIRDWEB_SECRET_KEY;
        const privateKey = process.env.MINTING_WALLET_PRIVATE_KEY || process.env.BACKEND_WALLET_PRIVATE_KEY;

        if (!contractAddress) {
            throw new Error('NFT contract address not configured (THIRDWEB_NFT_CONTRACT or NFT_CONTRACT_ADDRESS)');
        }

        logger.info(`Claiming NFT for wallet ${recipientWallet} (quantity: ${quantity})`);

        // Method 1: Thirdweb SDK (if secret key available)
        if (privateKey && secretKey) {
            try {
                const sdk = ThirdwebSDK.fromPrivateKey(privateKey, SDK_NETWORK, { secretKey });
                const contract = await sdk.getContract(contractAddress);
                const tx = await contract.erc721.claim(recipientWallet, quantity);

                const receipt = tx.receipt;
                let mintedTokenId = null;

                // Parse Transfer events to find minted token ID
                if (receipt?.logs) {
                    const transferIface = new ethers.utils.Interface(['event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)']);
                    for (const log of receipt.logs) {
                        try {
                            const parsed = transferIface.parseLog(log);
                            if (parsed?.name === 'Transfer') {
                                mintedTokenId = parsed.args.tokenId.toString();
                                break;
                            }
                        } catch { /* skip */ }
                    }
                }

                return {
                    success: true,
                    transactionHash: receipt?.transactionHash,
                    tokenId: mintedTokenId,
                    contractAddress,
                    recipient: recipientWallet,
                    method: 'sdk-claim'
                };
            } catch (sdkError) {
                logger.warn('Thirdweb SDK claim failed, falling back to ethers:', sdkError.message);
            }
        }

        // Method 2: Direct ethers.js claim
        if (privateKey) {
            const rpcUrl = process.env.ALCHEMY_RPC_URL
                || (IS_TESTNET ? process.env.ALCHEMY_AMOY_URL : process.env.ALCHEMY_POLYGON_URL)
                || (process.env.ALCHEMY_API_KEY
                    ? `https://polygon-${IS_TESTNET ? 'amoy' : 'mainnet'}.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
                    : (IS_TESTNET ? 'https://rpc-amoy.polygon.technology' : 'https://polygon-bor-rpc.publicnode.com'));
            const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
            const wallet = new ethers.Wallet(privateKey, provider);

            const claimABI = [
                'function claim(address receiver, uint256 quantity, address currency, uint256 pricePerToken, tuple(bytes32[] proof, uint256 quantityLimitPerWallet, uint256 pricePerToken, address currency) allowlistProof, bytes data) external payable',
                'function getActiveClaimConditionId() view returns (uint256)',
                'function getClaimConditionById(uint256 conditionId) view returns (tuple(uint256 startTimestamp, uint256 maxClaimableSupply, uint256 supplyClaimed, uint256 quantityLimitPerWallet, bytes32 merkleRoot, uint256 pricePerToken, address currency, string metadata))',
                'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
            ];

            const claimContract = new ethers.Contract(contractAddress, claimABI, wallet);
            const NATIVE = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

            // Read price and currency from the active claim condition
            const activeConditionId = await claimContract.getActiveClaimConditionId();
            const condition = await claimContract.getClaimConditionById(activeConditionId);
            const claimPrice = condition.pricePerToken.mul(quantity);
            const currency = condition.currency;
            const isNative = currency.toLowerCase() === NATIVE.toLowerCase();

            if (!isNative && condition.pricePerToken.gt(0)) {
                throw new Error(`Claim condition requires ERC20 payment (${currency}) which is not supported`);
            }

            const allowlistProof = {
                proof: [],
                quantityLimitPerWallet: 0,
                pricePerToken: 0,
                currency: ethers.constants.AddressZero
            };

            // Fetch current gas fees from the network to avoid "gas price below minimum" errors
            const feeData = await provider.getFeeData();
            const maxFeePerGas = feeData.maxFeePerGas?.mul(120).div(100) || undefined;  // 20% bump
            const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas?.mul(120).div(100) || undefined;

            const tx = await claimContract.claim(
                recipientWallet, quantity, currency, condition.pricePerToken, allowlistProof, '0x',
                {
                    value: isNative ? claimPrice : 0,
                    maxFeePerGas,
                    maxPriorityFeePerGas,
                    gasLimit: 300000
                }
            );

            const receipt = await tx.wait(1);

            // Parse Transfer event for token ID
            const transferIface = new ethers.utils.Interface(['event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)']);
            let mintedTokenId = null;
            for (const log of receipt.logs) {
                try {
                    const parsed = transferIface.parseLog(log);
                    if (parsed?.name === 'Transfer') {
                        mintedTokenId = parsed.args.tokenId.toString();
                        break;
                    }
                } catch { /* skip */ }
            }

            return {
                success: true,
                transactionHash: receipt.transactionHash,
                tokenId: mintedTokenId,
                contractAddress,
                recipient: recipientWallet,
                method: 'ethers-claim'
            };
        }

        throw new Error('No claim method available - configure BACKEND_WALLET_PRIVATE_KEY or THIRDWEB_SECRET_KEY');
    } catch (error) {
        logger.error('Error claiming NFT:', error);
        throw new Error(`Failed to claim NFT: ${error.message}`);
    }
};

// Transfer NFT (for secondary market transfers between wallets, not for initial claim)
export const transferNFTToWallet = async (recipientWallet, tokenId = null) => {
    try {
        const contractAddress = process.env.THIRDWEB_NFT_CONTRACT || process.env.NFT_CONTRACT_ADDRESS;
        const secretKey = process.env.THIRDWEB_SECRET_KEY;
        const ownerWallet = process.env.NFT_OWNER_WALLET;
        const privateKey = process.env.MINTING_WALLET_PRIVATE_KEY || process.env.BACKEND_WALLET_PRIVATE_KEY;

        if (!contractAddress) {
            throw new Error('NFT contract address not configured (THIRDWEB_NFT_CONTRACT or NFT_CONTRACT_ADDRESS)');
        }

        // Use Thirdweb Engine API for backend transactions if configured
        const engineUrl = process.env.THIRDWEB_ENGINE_URL || 'https://engine.thirdweb.com';
        const engineAccessToken = process.env.THIRDWEB_ENGINE_ACCESS_TOKEN;

        // If no token ID specified, look up the first available (unclaimed) token
        if (!tokenId) {
            const available = await getAvailableNFTs();
            if (available.length === 0) {
                throw new Error('No tokenId provided and no available NFTs found in owner wallet');
            }
            tokenId = available[0].tokenId;
        }

        logger.info(`Transferring NFT token ${tokenId} to wallet ${recipientWallet}`);

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
            logger.info('NFT transferred via Engine:', result);

            return {
                success: true,
                transactionHash: result.result?.transactionHash || result.transactionHash,
                tokenId: tokenId.toString(),
                contractAddress: contractAddress,
                recipient: recipientWallet,
                method: 'engine'
            };
        }

        // Fallback 1: Use Thirdweb SDK with private key if SDK secretKey is available
        if (privateKey && secretKey) {
            try {
                const sdk = ThirdwebSDK.fromPrivateKey(privateKey, SDK_NETWORK, { secretKey });
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
            } catch (sdkError) {
                logger.warn('Thirdweb SDK transfer failed, falling back to direct ethers:', sdkError.message);
            }
        }

        // Fallback 2: Direct Ethers.js transaction
        if (privateKey) {
            const rpcUrl = process.env.ALCHEMY_RPC_URL
                || (IS_TESTNET ? process.env.ALCHEMY_AMOY_URL : process.env.ALCHEMY_POLYGON_URL)
                || `https://polygon-${IS_TESTNET ? 'amoy' : 'mainnet'}.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY || ''}`;
            const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
            const wallet = new ethers.Wallet(privateKey, provider);

            const contractABI = [
                'function transferEdition(address to, uint256 tokenId) external',
                'function transferFrom(address from, address to, uint256 tokenId) public'
            ];

            const contract = new ethers.Contract(contractAddress, contractABI, wallet);

            let tx;
            try {
                tx = await contract.transferEdition(recipientWallet, tokenId);
            } catch (err) {
                tx = await contract.transferFrom(wallet.address, recipientWallet, tokenId);
            }

            const receipt = await tx.wait(1);

            return {
                success: true,
                transactionHash: receipt.transactionHash,
                tokenId: tokenId.toString(),
                contractAddress: contractAddress,
                recipient: recipientWallet,
                method: 'ethers'
            };
        }

        throw new Error('No transfer method available - configure THIRDWEB_ENGINE_ACCESS_TOKEN, MINTING_WALLET_PRIVATE_KEY, or BACKEND_WALLET_PRIVATE_KEY');
    } catch (error) {
        logger.error('Error transferring NFT:', error);
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
            logger.warn('Missing Thirdweb config for getAvailableNFTs');
            return [];
        }

        // Use read-only SDK
        const sdk = new ThirdwebSDK(SDK_NETWORK, { secretKey });
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
        logger.error('Error getting available NFTs:', error);
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

        const sdk = new ThirdwebSDK(SDK_NETWORK, { secretKey });
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
        logger.error('Error checking NFT ownership:', error);
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

        const sdk = new ThirdwebSDK(SDK_NETWORK, { secretKey });
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
        logger.error('Error getting NFT metadata:', error);
        return null;
    }
};

export default {
    claimNFTToWallet,
    transferNFTToWallet,
    getAvailableNFTs,
    checkNFTOwnership,
    getNFTMetadata
};
