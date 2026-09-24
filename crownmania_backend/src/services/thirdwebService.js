// Thirdweb & Ethers NFT Transfer Service
// For transferring pre-minted NFTs using Thirdweb Engine API or Ethers.js
import { createThirdwebClient, getContract, readContract, sendTransaction, waitForReceipt } from "thirdweb";
import { privateKeyToAccount } from "thirdweb/wallets";
import { polygon, polygonAmoy } from "thirdweb/chains";
import { claimTo, getOwnedNFTs, getNFT, transferFrom } from "thirdweb/extensions/erc721";
import { ethers } from "ethers";
import logger from '../config/logger.js';

const POLYGON_CHAIN_ID = process.env.POLYGON_CHAIN_ID || "137";
const IS_TESTNET = parseInt(POLYGON_CHAIN_ID) === 80002;
// Prefer our own RPC (Alchemy) over thirdweb's public proxy — it has higher
// limits and does not depend on the secret key's origin restrictions.
const CHAIN = (() => {
    const base = IS_TESTNET ? polygonAmoy : polygon;
    const rpc = process.env.POLYGON_RPC_URL || process.env.ALCHEMY_RPC_URL;
    return rpc ? { ...base, rpc } : base;
})();

const getThirdwebClient = () => {
    const secretKey = process.env.THIRDWEB_SECRET_KEY;
    return secretKey ? createThirdwebClient({ secretKey }) : null;
};

const getNftContract = (client, contractAddress) => getContract({
    client,
    chain: CHAIN,
    address: contractAddress
});

// Parse the minted token ID out of a transaction receipt's Transfer events
const parseMintedTokenId = (receipt) => {
    if (!receipt?.logs) return null;
    const transferIface = new ethers.utils.Interface(['event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)']);
    for (const log of receipt.logs) {
        try {
            const parsed = transferIface.parseLog(log);
            if (parsed?.name === 'Transfer') {
                return parsed.args.tokenId.toString();
            }
        } catch { /* skip */ }
    }
    return null;
};

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

        // Method 1: Thirdweb SDK v5 (if secret key available)
        const client = getThirdwebClient();
        if (privateKey && client) {
            try {
                const contract = getNftContract(client, contractAddress);
                const account = privateKeyToAccount({ client, privateKey });

                // Read the token ID that will be minted as a fallback if event parsing fails
                let expectedTokenId = null;
                try {
                    expectedTokenId = (await readContract({
                        contract,
                        method: 'function nextTokenIdToClaim() view returns (uint256)'
                    })).toString();
                } catch (predictErr) {
                    logger.warn('Could not predict next token ID:', predictErr.message);
                }

                const transaction = claimTo({ contract, to: recipientWallet, quantity: BigInt(quantity) });
                const { transactionHash } = await sendTransaction({ transaction, account });
                const receipt = await waitForReceipt({ client, chain: CHAIN, transactionHash });

                let mintedTokenId = parseMintedTokenId(receipt);

                if (!mintedTokenId && expectedTokenId) {
                    logger.warn(`Transfer event not parsed for sdk-claim; using predicted token ID ${expectedTokenId}`);
                    mintedTokenId = expectedTokenId;
                }

                return {
                    success: true,
                    transactionHash,
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
                'function nextTokenIdToClaim() view returns (uint256)',
                'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
            ];

            const claimContract = new ethers.Contract(contractAddress, claimABI, wallet);
            const NATIVE = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

            // Predict the token ID that will be minted as a fallback if event parsing fails
            let expectedTokenId = null;
            try {
                expectedTokenId = (await claimContract.nextTokenIdToClaim()).toString();
            } catch (predictErr) {
                logger.warn('Could not predict next token ID via ethers:', predictErr.message);
            }

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

            // Fetch current gas fees to avoid "gas price below minimum" on Polygon.
            // Some public RPCs return incorrect fee data, so enforce a minimum.
            const feeData = await provider.getFeeData();
            const MIN_PRIORITY_FEE = ethers.BigNumber.from('30000000000'); // 30 gwei
            const MIN_MAX_FEE = ethers.BigNumber.from('350000000000'); // 350 gwei
            const maxPriorityFeePerGas = (feeData.maxPriorityFeePerGas && feeData.maxPriorityFeePerGas.gte(MIN_PRIORITY_FEE))
                ? feeData.maxPriorityFeePerGas.mul(120).div(100)
                : MIN_PRIORITY_FEE;
            const maxFeePerGas = (feeData.maxFeePerGas && feeData.maxFeePerGas.gte(MIN_MAX_FEE))
                ? feeData.maxFeePerGas.mul(120).div(100)
                : MIN_MAX_FEE;

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

            let mintedTokenId = parseMintedTokenId(receipt);

            if (!mintedTokenId && expectedTokenId) {
                logger.warn(`Transfer event not parsed for ethers-claim; using predicted token ID ${expectedTokenId}`);
                mintedTokenId = expectedTokenId;
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

        // Fallback 1: Use Thirdweb SDK v5 with private key if secretKey is available
        const client = getThirdwebClient();
        if (privateKey && client) {
            try {
                const contract = getNftContract(client, contractAddress);
                const account = privateKeyToAccount({ client, privateKey });
                const transaction = transferFrom({
                    contract,
                    from: account.address,
                    to: recipientWallet,
                    tokenId: BigInt(tokenId)
                });
                const { transactionHash } = await sendTransaction({ transaction, account });

                return {
                    success: true,
                    transactionHash,
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
        const client = getThirdwebClient();

        if (!client || !contractAddress || !ownerWallet) {
            logger.warn('Missing Thirdweb config for getAvailableNFTs');
            return [];
        }

        const contract = getNftContract(client, contractAddress);

        // Get all NFTs owned by the owner wallet (these are available for claiming)
        const ownedTokens = await getOwnedNFTs({ contract, owner: ownerWallet });

        return ownedTokens.map(t => ({
            tokenId: t.id.toString(),
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
        const client = getThirdwebClient();

        if (!client || !contractAddress) {
            return { owned: false, tokens: [] };
        }

        const contract = getNftContract(client, contractAddress);
        const ownedTokens = await getOwnedNFTs({ contract, owner: walletAddress });

        return {
            owned: ownedTokens.length > 0,
            tokens: ownedTokens.map(t => ({
                tokenId: t.id.toString(),
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
        const client = getThirdwebClient();

        if (!client || !contractAddress) {
            return null;
        }

        const contract = getNftContract(client, contractAddress);
        const nft = await getNFT({ contract, tokenId: BigInt(tokenId), includeOwner: true });

        return {
            tokenId: nft.id.toString(),
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
