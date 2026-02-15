/**
 * Duplicate Claim Prevention Integration Tests
 * Uses jest.unstable_mockModule for proper ESM mocking
 */
import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';

// ── Mock all dependencies BEFORE dynamic imports ──

const mockRunTransaction = jest.fn();
const mockDocUpdate = jest.fn().mockResolvedValue(undefined);
const mockDocSet = jest.fn().mockResolvedValue(undefined);
const mockDocGet = jest.fn();
const mockDocRef = { update: mockDocUpdate, set: mockDocSet, get: mockDocGet, id: 'mock-doc-id' };
const mockDoc = jest.fn(() => mockDocRef);
const mockWhere = jest.fn(() => ({ get: jest.fn().mockResolvedValue({ empty: true, docs: [] }) }));
const mockCollection = jest.fn(() => ({ doc: mockDoc, where: mockWhere }));

jest.unstable_mockModule('../../src/config/firebase.js', () => ({
    db: {
        collection: mockCollection,
        runTransaction: mockRunTransaction,
    },
    admin: {},
}));

jest.unstable_mockModule('../../src/config/email.js', () => ({
    sgMail: { send: jest.fn().mockResolvedValue(undefined), setApiKey: jest.fn() },
    EMAIL_CONFIG: { from: { email: 'test@test.com', name: 'Test' } },
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendClaimConfirmationEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.unstable_mockModule('../../src/services/notificationService.js', () => ({
    sendScanAttemptEmail: jest.fn().mockResolvedValue(undefined),
    sendCodeEntryEmail: jest.fn().mockResolvedValue(undefined),
    sendClaimAttemptEmail: jest.fn().mockResolvedValue(undefined),
    sendConnectionAttemptEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.unstable_mockModule('../../src/services/thirdwebService.js', () => ({
    transferNFTToWallet: jest.fn().mockResolvedValue({
        success: true,
        tokenId: '123',
        transactionHash: '0xabc',
        contractAddress: '0xcontract',
    }),
    checkNFTOwnership: jest.fn().mockResolvedValue({ owned: false, tokens: [] }),
}));

jest.unstable_mockModule('../../src/services/queueService.js', () => ({
    queueService: {
        addToQueue: jest.fn().mockResolvedValue(undefined),
        enqueueTransfer: jest.fn().mockResolvedValue(undefined),
    },
}));

jest.unstable_mockModule('../../src/config/logger.js', () => ({
    default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), http: jest.fn() },
}));

jest.unstable_mockModule('../../src/utils/contentSecurity.js', () => ({
    contentSecurity: {
        sanitizeInput: jest.fn((v) => v),
        logSecurityEvent: jest.fn(),
    },
}));

jest.unstable_mockModule('../../src/services/signatureService.js', () => ({
    default: {
        generateNonce: jest.fn().mockResolvedValue({
            nonce: 'test-nonce-123',
            message: 'Sign this message to verify your wallet: test-nonce-123',
            expiresAt: new Date(Date.now() + 300000),
        }),
        verifySignature: jest.fn().mockResolvedValue(true),
    },
}));

jest.unstable_mockModule('../../src/middleware/rateLimiter.js', () => ({
    serialNumberLimiter: (req, res, next) => next(),
    claimLimiter: (req, res, next) => next(),
}));

jest.unstable_mockModule('../../src/middleware/validation.js', () => ({
    validateSerialNumber: (req, res, next) => next(),
    validateWallet: (req, res, next) => next(),
}));

// Mock auth middleware to auto-authenticate
jest.unstable_mockModule('../../src/middleware/auth.js', () => ({
    authenticateWallet: (req, res, next) => {
        req.wallet = (req.body.walletAddress || '').toLowerCase();
        next();
    },
    getNonceHandler: async (req, res) => {
        res.json({
            nonce: 'test-nonce',
            message: 'Sign this message to verify your wallet: test-nonce',
            messageTemplate: 'Sign this message to {ACTION} with wallet {WALLET_ADDRESS}: test-nonce',
            expiresAt: new Date(Date.now() + 300000),
        });
    },
}));

// Dynamic imports AFTER mocks
const { default: express } = await import('express');
const { default: request } = await import('supertest');
const { verificationRouter } = await import('../../src/routes/verification.js');

describe('Duplicate Claim Prevention', () => {
    let app;
    const address1 = '0x1234567890abcdef1234567890abcdef12345678';
    const address2 = '0xabcdef1234567890abcdef1234567890abcdef12';

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use('/api/verification', verificationRouter);
    });

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset the doc mock to return a working ref with update
        mockDoc.mockReturnValue({ update: mockDocUpdate, set: mockDocSet, get: mockDocGet, id: 'mock-doc-id' });
    });

    it('should prevent duplicate claims on the same serial number', async () => {
        let claimAttempts = 0;

        mockRunTransaction.mockImplementation(async (callback) => {
            claimAttempts++;
            const mockTransaction = {
                get: jest.fn().mockImplementation(() => {
                    if (claimAttempts === 1) {
                        return Promise.resolve({
                            exists: true,
                            data: () => ({ productId: 'test-product', claimed: false }),
                        });
                    } else {
                        return Promise.resolve({
                            exists: true,
                            data: () => ({ productId: 'test-product', claimed: true, claimedBy: address1 }),
                        });
                    }
                }),
                set: jest.fn(),
                update: jest.fn(),
            };

            return callback(mockTransaction);
        });

        // First claim
        const claim1 = await request(app)
            .post('/api/verification/claim')
            .send({
                productId: 'abcd1234abcd1234abcd1234abcd1234',
                walletAddress: address1,
                signature: '0x' + 'a'.repeat(130),
                message: 'test message',
            });

        expect(claim1.body.success).toBe(true);

        // Second claim on same serial should fail
        const claim2 = await request(app)
            .post('/api/verification/claim')
            .send({
                productId: 'abcd1234abcd1234abcd1234abcd1234',
                walletAddress: address2,
                signature: '0x' + 'b'.repeat(130),
                message: 'test message',
            });

        expect(claim2.body.success).toBe(false);
    });

    it('should return error for invalid claim code', async () => {
        mockRunTransaction.mockImplementation(async (callback) => {
            const mockTransaction = {
                get: jest.fn().mockResolvedValue({ exists: false }),
                set: jest.fn(),
                update: jest.fn(),
            };

            return callback(mockTransaction);
        });

        const claimRes = await request(app)
            .post('/api/verification/claim')
            .send({
                productId: 'invalid1234invalid1234invalid12',
                walletAddress: address1,
                signature: '0x' + 'a'.repeat(130),
                message: 'test message',
            });

        expect(claimRes.body.success).toBe(false);
    });
});
