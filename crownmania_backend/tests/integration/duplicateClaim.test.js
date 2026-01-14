import request from 'supertest';
import express from 'express';
import { verificationRouter } from '../../src/routes/verification.js';
import { ethers } from 'ethers';
import { db } from '../../src/config/firebase.js';

// Mock firebase with transaction support
jest.mock('../../src/config/firebase.js', () => ({
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
        runTransaction: jest.fn(),
    },
}));

// Mock thirdweb
jest.mock('../../src/services/thirdwebService.js', () => ({
    transferNFTToWallet: jest.fn(() => Promise.resolve({
        success: true,
        tokenId: '123',
        transactionHash: '0xabc',
        contractAddress: '0xcontract'
    })),
    checkNFTOwnership: jest.fn(() => Promise.resolve({ owned: false, tokens: [] })),
}));

const app = express();
app.use(express.json());
app.use('/api/verification', verificationRouter);

describe('Duplicate Claim Prevention', () => {
    let wallet1, wallet2;
    let address1, address2;

    beforeAll(async () => {
        wallet1 = ethers.Wallet.createRandom();
        wallet2 = ethers.Wallet.createRandom();
        address1 = wallet1.address;
        address2 = wallet2.address;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should prevent duplicate claims on the same serial number', async () => {
        const testSerial = 'abcd1234abcd1234abcd1234abcd1234';
        let claimAttempts = 0;
        let firstClaimSucceeded = false;

        // Mock the transaction to simulate real behavior
        db.runTransaction.mockImplementation(async (callback) => {
            claimAttempts++;

            // Simulate the transaction reading and writing
            const mockTransaction = {
                get: jest.fn().mockImplementation((ref) => {
                    // Return the claim code as unclaimed for first attempt, claimed for second
                    if (claimAttempts === 1) {
                        return Promise.resolve({
                            exists: true,
                            data: () => ({ productId: 'test-product', claimed: false })
                        });
                    } else {
                        // Second attempt should see it as claimed
                        return Promise.resolve({
                            exists: true,
                            data: () => ({ productId: 'test-product', claimed: true, claimedBy: address1 })
                        });
                    }
                }),
                set: jest.fn(),
                update: jest.fn(),
            };

            try {
                await callback(mockTransaction);
                if (claimAttempts === 1) {
                    firstClaimSucceeded = true;
                }
            } catch (error) {
                if (error.message.includes('already been claimed')) {
                    throw error;
                }
            }
        });

        // Get nonce for signing
        const nonceRes = await request(app).get('/api/verification/nonce');
        expect(nonceRes.status).toBe(200);
        const { messageTemplate } = nonceRes.body;

        // First claim attempt
        const message1 = messageTemplate
            .replace('{ACTION}', 'claim')
            .replace('{WALLET_ADDRESS}', address1);
        const signature1 = await wallet1.signMessage(message1);

        const claim1 = await request(app)
            .post('/api/verification/claim')
            .send({
                productId: testSerial,
                walletAddress: address1,
                signature: signature1,
                message: message1
            });

        expect(claim1.status).toBe(200);
        expect(claim1.body.success).toBe(true);

        // Second claim attempt on same serial should fail
        const message2 = messageTemplate
            .replace('{ACTION}', 'claim')
            .replace('{WALLET_ADDRESS}', address2);
        const signature2 = await wallet2.signMessage(message2);

        const claim2 = await request(app)
            .post('/api/verification/claim')
            .send({
                productId: testSerial,
                walletAddress: address2,
                signature: signature2,
                message: message2
            });

        // Should fail because already claimed
        expect(claim2.body.success).toBe(false);
        expect(claim2.body.message).toContain('already been claimed');
    });

    it('should allow claiming different serial numbers by same wallet', async () => {
        const serial1 = 'abcd1234abcd1234abcd1234abcd0001';
        const serial2 = 'abcd1234abcd1234abcd1234abcd0002';

        // Mock successful claims for different serials
        db.runTransaction.mockImplementation(async (callback) => {
            const mockTransaction = {
                get: jest.fn().mockResolvedValue({
                    exists: true,
                    data: () => ({ productId: 'test-product', claimed: false })
                }),
                set: jest.fn(),
                update: jest.fn(),
            };
            await callback(mockTransaction);
        });

        const nonceRes = await request(app).get('/api/verification/nonce');
        const { messageTemplate } = nonceRes.body;

        const message = messageTemplate
            .replace('{ACTION}', 'claim')
            .replace('{WALLET_ADDRESS}', address1);
        const signature = await wallet1.signMessage(message);

        // Claim first serial
        const claim1 = await request(app)
            .post('/api/verification/claim')
            .send({
                productId: serial1,
                walletAddress: address1,
                signature,
                message
            });

        expect(claim1.body.success).toBe(true);

        // Claim second serial with same wallet
        const claim2 = await request(app)
            .post('/api/verification/claim')
            .send({
                productId: serial2,
                walletAddress: address1,
                signature,
                message
            });

        expect(claim2.body.success).toBe(true);
    });

    it('should return error for invalid claim code', async () => {
        const invalidSerial = 'invalid1234invalid1234invalid12';

        // Mock claim code not found
        db.runTransaction.mockImplementation(async (callback) => {
            const mockTransaction = {
                get: jest.fn().mockResolvedValue({
                    exists: false
                }),
                set: jest.fn(),
                update: jest.fn(),
            };

            try {
                await callback(mockTransaction);
            } catch (error) {
                throw error;
            }
        });

        const nonceRes = await request(app).get('/api/verification/nonce');
        const { messageTemplate } = nonceRes.body;

        const message = messageTemplate
            .replace('{ACTION}', 'claim')
            .replace('{WALLET_ADDRESS}', address1);
        const signature = await wallet1.signMessage(message);

        const claimRes = await request(app)
            .post('/api/verification/claim')
            .send({
                productId: invalidSerial,
                walletAddress: address1,
                signature,
                message
            });

        expect(claimRes.body.success).toBe(false);
        expect(claimRes.body.message).toContain('Invalid claim code');
    });
});
