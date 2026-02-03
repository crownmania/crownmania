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

describe('Max Edition Enforcement', () => {
    let wallet;
    let address;

    beforeAll(async () => {
        wallet = ethers.Wallet.createRandom();
        address = wallet.address;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should reject claims when max editions (500) reached', async () => {
        const testSerial = 'abcd1234abcd1234abcd1234abcd1234';

        // Mock transaction that throws "All editions claimed" error
        db.runTransaction.mockImplementation(async (callback) => {
            const mockTransaction = {
                get: jest.fn()
                    // First call: get claim code
                    .mockResolvedValueOnce({
                        exists: true,
                        data: () => ({ productId: 'test-product', claimed: false })
                    })
                    // Second call: get product
                    .mockResolvedValueOnce({
                        exists: true,
                        data: () => ({ name: 'Test Product', totalEditions: 500 })
                    })
                    // Third call: get counter - at max
                    .mockResolvedValueOnce({
                        exists: true,
                        data: () => ({ currentEdition: 500, totalEditions: 500 })
                    }),
                set: jest.fn(),
                update: jest.fn(),
            };

            await callback(mockTransaction);
        });

        const nonceRes = await request(app).get('/api/verification/nonce');
        expect(nonceRes.status).toBe(200);
        const { messageTemplate } = nonceRes.body;

        const message = messageTemplate
            .replace('{ACTION}', 'claim')
            .replace('{WALLET_ADDRESS}', address);
        const signature = await wallet.signMessage(message);

        const claimRes = await request(app)
            .post('/api/verification/claim')
            .send({
                productId: testSerial,
                walletAddress: address,
                signature,
                message
            });

        // Should fail because max editions reached
        expect(claimRes.body.success).toBe(false);
        expect(claimRes.body.message).toContain('editions');
    });

    it('should successfully claim edition 1 when counter does not exist', async () => {
        const testSerial = 'abcd1234abcd1234abcd1234abcd0001';

        // Mock transaction for first claim (no counter exists)
        db.runTransaction.mockImplementation(async (callback) => {
            const mockTransaction = {
                get: jest.fn()
                    .mockResolvedValueOnce({
                        exists: true,
                        data: () => ({ productId: 'test-product', claimed: false })
                    })
                    .mockResolvedValueOnce({
                        exists: true,
                        data: () => ({ name: 'Test Product', totalEditions: 500 })
                    })
                    .mockResolvedValueOnce({
                        exists: false // Counter doesn't exist yet
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
            .replace('{WALLET_ADDRESS}', address);
        const signature = await wallet.signMessage(message);

        const claimRes = await request(app)
            .post('/api/verification/claim')
            .send({
                productId: testSerial,
                walletAddress: address,
                signature,
                message
            });

        expect(claimRes.body.success).toBe(true);
        expect(claimRes.body.edition).toBe(1);
    });

    it('should increment edition number correctly', async () => {
        const testSerial = 'abcd1234abcd1234abcd1234abcd0002';
        const currentEdition = 42;

        // Mock transaction with existing counter
        db.runTransaction.mockImplementation(async (callback) => {
            const mockTransaction = {
                get: jest.fn()
                    .mockResolvedValueOnce({
                        exists: true,
                        data: () => ({ productId: 'test-product', claimed: false })
                    })
                    .mockResolvedValueOnce({
                        exists: true,
                        data: () => ({ name: 'Test Product', totalEditions: 500 })
                    })
                    .mockResolvedValueOnce({
                        exists: true,
                        data: () => ({ currentEdition: currentEdition, totalEditions: 500 })
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
            .replace('{WALLET_ADDRESS}', address);
        const signature = await wallet.signMessage(message);

        const claimRes = await request(app)
            .post('/api/verification/claim')
            .send({
                productId: testSerial,
                walletAddress: address,
                signature,
                message
            });

        expect(claimRes.body.success).toBe(true);
        expect(claimRes.body.edition).toBe(currentEdition + 1);
    });
});

describe('Serial Format Validation', () => {
    let wallet;
    let address;

    beforeAll(async () => {
        wallet = ethers.Wallet.createRandom();
        address = wallet.address;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should reject claims with invalid serial format (too short)', async () => {
        const invalidSerial = 'abc123'; // Too short

        const nonceRes = await request(app).get('/api/verification/nonce');
        const { messageTemplate } = nonceRes.body;

        const message = messageTemplate
            .replace('{ACTION}', 'claim')
            .replace('{WALLET_ADDRESS}', address);
        const signature = await wallet.signMessage(message);

        const claimRes = await request(app)
            .post('/api/verification/claim')
            .send({
                productId: invalidSerial,
                walletAddress: address,
                signature,
                message
            });

        expect(claimRes.body.success).toBe(false);
        expect(claimRes.body.message).toContain('Invalid serial number format');
    });

    it('should reject claims with invalid serial format (non-hex)', async () => {
        const invalidSerial = 'ghijklmnghijklmnghijklmnghijklmn'; // Not hex

        const nonceRes = await request(app).get('/api/verification/nonce');
        const { messageTemplate } = nonceRes.body;

        const message = messageTemplate
            .replace('{ACTION}', 'claim')
            .replace('{WALLET_ADDRESS}', address);
        const signature = await wallet.signMessage(message);

        const claimRes = await request(app)
            .post('/api/verification/claim')
            .send({
                productId: invalidSerial,
                walletAddress: address,
                signature,
                message
            });

        expect(claimRes.body.success).toBe(false);
        expect(claimRes.body.message).toContain('Invalid serial number format');
    });

    it('should reject claims with invalid wallet address', async () => {
        const validSerial = 'abcd1234abcd1234abcd1234abcd1234';
        const invalidWallet = 'not-a-wallet';

        const nonceRes = await request(app).get('/api/verification/nonce');
        const { messageTemplate } = nonceRes.body;

        const message = messageTemplate
            .replace('{ACTION}', 'claim')
            .replace('{WALLET_ADDRESS}', invalidWallet);

        // Can't sign with real wallet for invalid address test
        // The auth middleware should reject before reaching service

        const claimRes = await request(app)
            .post('/api/verification/claim')
            .send({
                productId: validSerial,
                walletAddress: invalidWallet,
                signature: '0x123',
                message
            });

        // Should fail due to invalid wallet format
        expect(claimRes.status).toBe(400);
    });

    it('should accept valid 32-char hex serial', async () => {
        const validSerial = 'abcd1234abcd1234abcd1234abcd1234';

        // Mock successful claim
        db.runTransaction.mockImplementation(async (callback) => {
            const mockTransaction = {
                get: jest.fn()
                    .mockResolvedValueOnce({
                        exists: true,
                        data: () => ({ productId: 'test-product', claimed: false })
                    })
                    .mockResolvedValueOnce({
                        exists: true,
                        data: () => ({ name: 'Test Product', totalEditions: 500 })
                    })
                    .mockResolvedValueOnce({
                        exists: false
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
            .replace('{WALLET_ADDRESS}', address);
        const signature = await wallet.signMessage(message);

        const claimRes = await request(app)
            .post('/api/verification/claim')
            .send({
                productId: validSerial,
                walletAddress: address,
                signature,
                message
            });

        expect(claimRes.body.success).toBe(true);
    });
});
