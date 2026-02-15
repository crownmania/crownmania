/**
 * NFT Claiming Integration Tests
 * Uses jest.unstable_mockModule for proper ESM mocking
 */
import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';

// ── Mock all dependencies BEFORE dynamic imports ──

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
        runTransaction: jest.fn((cb) => cb({
            get: jest.fn(),
            set: jest.fn(),
            update: jest.fn(),
        })),
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

// Dynamic imports AFTER mocks
const { default: express } = await import('express');
const { default: request } = await import('supertest');
const { verificationRouter } = await import('../../src/routes/verification.js');

describe('NFT Claiming Integration', () => {
    let app;

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use('/api/verification', verificationRouter);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return nonce for wallet authentication', async () => {
        const res = await request(app).get('/api/verification/nonce');
        expect(res.status).toBe(200);
        expect(res.body.nonce).toBeDefined();
        expect(res.body.messageTemplate).toBeDefined();
    });

    it('should fail if signature is invalid', async () => {
        const claimRes = await request(app)
            .post('/api/verification/claim')
            .send({
                productId: 'code123',
                walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
                signature: '0x' + '0'.repeat(130),
                message: 'Sign this message',
            });

        // Should fail due to auth middleware checking signature (no valid nonce/signature)
        expect(claimRes.status).toBe(401);
    });
});
