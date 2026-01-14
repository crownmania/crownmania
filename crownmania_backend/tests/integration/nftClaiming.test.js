import request from 'supertest';
import express from 'express';
import { verificationRouter } from '../../src/routes/verification.js';
import { ethers } from 'ethers';
import { db } from '../../src/config/firebase.js';

console.log('Loading test file...');

// Mock firebase
jest.mock('../../src/config/firebase.js', () => {
    console.log('Mocking firebase...');
    return {
        db: {
            collection: jest.fn(() => ({
                doc: jest.fn(() => ({
                    get: jest.fn(),
                    set: jest.fn(),
                    update: jest.fn(),
                })),
                where: jest.fn(() => ({
                    get: jest.fn(),
                })),
            })),
            runTransaction: jest.fn((cb) => cb({
                get: jest.fn(),
                set: jest.fn(),
                update: jest.fn(),
            })),
        },
    };
});

// Mock thirdweb
jest.mock('../../src/services/thirdwebService.js', () => {
    console.log('Mocking thirdweb...');
    return {
        transferNFTToWallet: jest.fn(() => Promise.resolve({
            success: true,
            tokenId: '123',
            transactionHash: '0xabc',
            contractAddress: '0xcontract'
        })),
        checkNFTOwnership: jest.fn(() => Promise.resolve({ owned: false, tokens: [] })),
    };
});

const app = express();
app.use(express.json());
app.use('/api/verification', (req, res, next) => {
    console.log('Router use...');
    verificationRouter(req, res, next);
});

describe('NFT Claiming Integration', () => {
    let wallet;
    let walletAddress;

    beforeAll(async () => {
        wallet = ethers.Wallet.createRandom();
        walletAddress = wallet.address;
    });

    it('should successfully claim a product with a valid signature', async () => {
        // 1. Get nonce
        const nonceRes = await request(app).get('/api/verification/nonce');
        expect(nonceRes.status).toBe(200);
        const { nonce, messageTemplate } = nonceRes.body;

        // 2. Mock Firestore data for claim code and product
        const mockProduct = {
            name: 'Test Product',
            type: 1,
            totalEditions: 100,
        };
        const mockClaimCode = {
            productId: 'prod123',
            claimed: false,
        };

        const mockGet = jest.fn()
            .mockResolvedValueOnce({ exists: true, data: () => mockClaimCode }) // claimCodeDoc
            .mockResolvedValueOnce({ exists: true, data: () => mockProduct });   // productDoc

        db.collection().doc().get = mockGet;

        // Mock transaction for edition counting
        db.runTransaction.mockImplementation(async (cb) => {
            return cb({
                get: jest.fn().mockResolvedValue({ exists: false }), // counterDoc doesn't exist yet
                set: jest.fn(),
                update: jest.fn(),
            });
        });

        // 3. Sign the message
        const message = messageTemplate
            .replace('{ACTION}', 'claim')
            .replace('{WALLET_ADDRESS}', walletAddress);
        const signature = await wallet.signMessage(message);

        // 4. Claim
        const claimRes = await request(app)
            .post('/api/verification/claim')
            .send({
                productId: 'code123',
                walletAddress,
                signature,
                message
            });

        expect(claimRes.status).toBe(200);
        expect(claimRes.body.success).toBe(true);
        expect(claimRes.body.edition).toBe(1);
    });

    it('should fail if signature is invalid', async () => {
        const nonceRes = await request(app).get('/api/verification/nonce');
        const { messageTemplate } = nonceRes.body;

        const message = messageTemplate
            .replace('{ACTION}', 'claim')
            .replace('{WALLET_ADDRESS}', walletAddress);
        const invalidSignature = '0x' + '0'.repeat(130); // Invalid signature

        const claimRes = await request(app)
            .post('/api/verification/claim')
            .send({
                productId: 'code123',
                walletAddress,
                signature: invalidSignature,
                message
            });

        expect(claimRes.status).toBe(401);
        expect(claimRes.body.error).toBeDefined();
    });
});
