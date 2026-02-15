/**
 * SECURITY REGRESSION TESTS — Auth Gate Verification
 * ===================================================
 * These tests verify that hardened endpoints reject unauthenticated requests.
 * Uses supertest against an Express app with mocked backends.
 *
 * Findings covered:
 *   S3  — DELETE /api/content/:contentId requires admin auth
 *   S4  — POST /api/content/upload requires admin auth
 *   S5  — POST /api/verification/issue-token requires wallet auth
 *   S13 — POST /api/webhooks/nft-transfer rejects without webhook secret
 *   S17 — Wallet auth rejects non-nonce messages
 *   S7  — contentSecurity secrets work
 *   S8  — encryptionService PII key works
 */

import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';

// ── Mock Firebase Admin SDK (must use unstable_mockModule for ESM) ──

const mockGet = jest.fn().mockResolvedValue({ empty: true, docs: [] });
const mockDocRef = {
    get: mockGet,
    set: jest.fn(),
    update: jest.fn(),
};
const mockCollectionRef = {
    doc: jest.fn().mockReturnValue(mockDocRef),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    get: mockGet,
    add: jest.fn(),
};

jest.unstable_mockModule('../../src/config/firebase.js', () => ({
    db: { collection: jest.fn().mockReturnValue(mockCollectionRef) },
    admin: {
        auth: () => ({
            verifyIdToken: jest.fn().mockRejectedValue(new Error('Mock: no valid token')),
        }),
    },
}));

jest.unstable_mockModule('../../src/config/logger.js', () => ({
    default: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));

jest.unstable_mockModule('../../src/config/email.js', () => ({
    sendClaimConfirmationEmail: jest.fn(),
    sgMail: { send: jest.fn() },
    EMAIL_CONFIG: { from: 'test@test.com' },
}));

jest.unstable_mockModule('../../src/services/notificationService.js', () => ({
    sendScanAttemptEmail: jest.fn(),
    sendCodeEntryEmail: jest.fn(),
    sendClaimAttemptEmail: jest.fn(),
    sendContentDropNotification: jest.fn().mockResolvedValue(undefined),
}));

jest.unstable_mockModule('../../src/services/verificationService.js', () => ({
    verificationService: {
        verifySerialNumber: jest.fn(),
        claimProduct: jest.fn(),
        issueToken: jest.fn(),
        getWalletTokens: jest.fn(),
        generateEmailVerification: jest.fn(),
        verifyToken: jest.fn(),
    },
}));

jest.unstable_mockModule('../../src/services/contentService.js', () => ({
    contentService: {
        uploadContent: jest.fn(),
        deleteContent: jest.fn(),
        generateSignedUrl: jest.fn(),
        getProductContent: jest.fn().mockResolvedValue([]),
        getAccessibleContent: jest.fn().mockResolvedValue([]),
        validateSignedUrl: jest.fn(),
        verifyTokenAccess: jest.fn(),
        db: { collection: jest.fn().mockReturnValue(mockCollectionRef) },
    },
}));

// ── Dynamic imports AFTER mocks ──
const express = (await import('express')).default;
const supertest = (await import('supertest')).default;
const { default: contentRouter } = await import('../../src/routes/content.js');
const { verificationRouter } = await import('../../src/routes/verification.js');
const { default: webhooksRouter } = await import('../../src/routes/webhooks.js');

// Build minimal Express app
const app = express();
app.use(express.json());
app.use('/api/content', contentRouter);
app.use('/api/verification', verificationRouter);
app.use('/api/webhooks', webhooksRouter);


describe('Security Regression: Auth Gates', () => {

    // ── S3: DELETE /api/content/:contentId requires admin auth ──
    describe('S3: Content DELETE auth gate', () => {
        it('should reject unauthenticated DELETE requests', async () => {
            const res = await supertest(app)
                .delete('/api/content/test-content-id-123');

            // requireAdmin should reject with 401 or 403
            expect([401, 403]).toContain(res.status);
        });
    });

    // ── S4: POST /api/content/upload requires admin auth ──
    describe('S4: Content upload auth gate', () => {
        it('should reject unauthenticated upload requests', async () => {
            const res = await supertest(app)
                .post('/api/content/upload')
                .send({});

            expect([401, 403]).toContain(res.status);
        });
    });

    // ── S5: POST /api/verification/issue-token requires wallet auth ──
    describe('S5: Issue-token auth gate', () => {
        it('should reject requests without wallet signature', async () => {
            const res = await supertest(app)
                .post('/api/verification/issue-token')
                .send({
                    serialNumber: 'TEST123',
                    walletAddress: '0x0000000000000000000000000000000000000000',
                });

            // authenticateWallet requires signature + message + walletAddress
            expect([400, 401]).toContain(res.status);
        });
    });

    // ── S13: Moralis webhook rejects without configured secret ──
    describe('S13: Moralis webhook fail-closed', () => {
        it('should reject webhook when MORALIS_WEBHOOK_SECRET is not set', async () => {
            const originalSecret = process.env.MORALIS_WEBHOOK_SECRET;
            delete process.env.MORALIS_WEBHOOK_SECRET;

            const res = await supertest(app)
                .post('/api/webhooks/nft-transfer')
                .send({
                    confirmed: true,
                    chainId: '137',
                    to: '0x1234567890123456789012345678901234567890',
                    from: '0x0000000000000000000000000000000000000000',
                    tokenId: '1',
                    contractAddress: '0xABCDEF1234567890ABCDEF1234567890ABCDEF12',
                });

            // Restore
            if (originalSecret) {
                process.env.MORALIS_WEBHOOK_SECRET = originalSecret;
            }

            expect(res.status).toBe(401);
        });

        it('should reject webhook with invalid signature', async () => {
            process.env.MORALIS_WEBHOOK_SECRET = 'test-secret-value';

            const res = await supertest(app)
                .post('/api/webhooks/nft-transfer')
                .set('x-signature', 'invalid-signature')
                .send({ confirmed: true });

            expect(res.status).toBe(401);

            // Cleanup
            delete process.env.MORALIS_WEBHOOK_SECRET;
        });
    });

    // ── S17: Wallet auth rejects non-nonce messages ──
    describe('S17: Simple wallet auth fallback removed', () => {
        it('should reject messages without nonce-based format', async () => {
            const res = await supertest(app)
                .post('/api/verification/issue-token')
                .send({
                    serialNumber: 'TEST123',
                    walletAddress: '0x0000000000000000000000000000000000000000',
                    signature: '0x' + 'a'.repeat(130),
                    message: 'I want to claim on crownmania',
                });

            // Should be rejected because message doesn't have nonce format
            expect([400, 401]).toContain(res.status);
        });
    });
});


describe('Security Regression: Fail-fast Boot Checks', () => {

    // ── S7: contentSecurity requires secrets in production ──
    describe('S7: contentSecurity secrets work', () => {
        it('should produce valid SHA-256 hashes', async () => {
            const { contentSecurity } = await import('../../src/utils/contentSecurity.js');

            const hash = contentSecurity.hashSerialNumber('TEST123');
            expect(hash).toBeTruthy();
            expect(typeof hash).toBe('string');
            expect(hash.length).toBe(64); // SHA-256 hex = 64 chars
        });

        it('should verify serial hash correctly', async () => {
            const { contentSecurity } = await import('../../src/utils/contentSecurity.js');

            const serial = 'CROWN_SERIAL_001';
            const hash = contentSecurity.hashSerialNumber(serial);
            expect(contentSecurity.verifySerialHash(serial, hash)).toBe(true);
            expect(contentSecurity.verifySerialHash('WRONG_SERIAL', hash)).toBe(false);
        });
    });

    // ── S8: encryptionService PII key works ──
    describe('S8: encryptionService deterministic key', () => {
        it('should encrypt and decrypt consistently', async () => {
            const { encryptionService } = await import('../../src/services/encryptionService.js');

            const original = 'test@example.com';
            const encrypted = encryptionService.encrypt(original);
            expect(encrypted).toBeTruthy();
            expect(encrypted).not.toBe(original);

            const decrypted = encryptionService.decrypt(encrypted);
            expect(decrypted).toBe(original);
        });

        it('should mask data correctly', async () => {
            const { encryptionService } = await import('../../src/services/encryptionService.js');

            const masked = encryptionService.mask('test@example.com');
            expect(masked).toBe('tes***com');
        });
    });
});
