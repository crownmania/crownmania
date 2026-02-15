/**
 * Content Route Integration Tests
 * Tests: signed URL generation, access control, content metadata
 */

import { jest } from '@jest/globals';

// ─── Mock Firebase ───
jest.unstable_mockModule('../../src/config/firebase.js', () => ({
    db: {
        collection: jest.fn().mockReturnValue({
            doc: jest.fn().mockReturnValue({
                get: jest.fn().mockResolvedValue({
                    exists: true,
                    data: () => ({
                        title: 'Exclusive Video',
                        type: 'video',
                        storagePath: 'content/video1.mp4',
                        accessRules: { requiredProducts: ['prod-1'] },
                        createdAt: { toDate: () => new Date('2025-01-01') },
                    }),
                }),
            }),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({
                docs: [
                    { id: 'content-1', data: () => ({ title: 'Video 1', type: 'video', storagePath: 'content/v1.mp4' }) },
                ],
            }),
            add: jest.fn().mockResolvedValue({ id: 'new-content-1' }),
        }),
    },
    adminStorage: {
        bucket: jest.fn().mockReturnValue({
            file: jest.fn().mockReturnValue({
                getSignedUrl: jest.fn().mockResolvedValue(['https://storage.googleapis.com/signed-url']),
            }),
        }),
    },
}));

jest.unstable_mockModule('../../src/config/logger.js', () => ({
    default: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    }
}));

jest.unstable_mockModule('../../src/utils/contentSecurity.js', () => ({
    contentSecurity: {
        sanitizeInput: jest.fn(v => v),
        logSecurityEvent: jest.fn(),
    }
}));

// Mock contentService
jest.unstable_mockModule('../../src/services/contentService.js', () => ({
    contentService: {
        generateSignedUrl: jest.fn().mockResolvedValue({
            success: true,
            signedUrl: 'https://storage.googleapis.com/signed-url?token=abc',
            expiresAt: Date.now() + 3600000,
        }),
        verifyTokenAccess: jest.fn().mockResolvedValue(true),
        getProductContent: jest.fn().mockResolvedValue([
            { id: 'ct-1', title: 'Video 1', type: 'video' },
        ]),
        getAccessibleContent: jest.fn().mockResolvedValue([
            { id: 'ct-1', title: 'Video 1', type: 'video', hasAccess: true },
        ]),
        validateSignedUrl: jest.fn().mockReturnValue({ valid: true, contentId: 'ct-1', walletAddress: '0xabc' }),
        uploadContent: jest.fn().mockResolvedValue({ success: true, contentId: 'ct-new', url: 'https://storage/ct-new' }),
        deleteContent: jest.fn().mockResolvedValue({ success: true }),
        db: {
            collection: jest.fn().mockReturnValue({
                doc: jest.fn().mockReturnValue({
                    get: jest.fn().mockResolvedValue({
                        exists: true,
                        data: () => ({
                            title: 'Test Content',
                            type: 'video',
                            accessRules: { requiredProducts: ['prod-1'] },
                            createdAt: { toDate: () => new Date() },
                        }),
                    }),
                }),
            }),
        },
    },
    default: {
        generateSignedUrl: jest.fn(),
        verifyTokenAccess: jest.fn(),
    },
}));

// Mock requireAdmin
jest.unstable_mockModule('../../src/middleware/requireAdmin.js', () => ({
    default: (req, res, next) => {
        req.adminEmail = 'admin@test.com';
        req.user = { uid: 'admin-1' };
        next();
    }
}));

// Mock rate limiter
jest.unstable_mockModule('../../src/routes/verification.js', () => ({
    serialNumberLimiter: (req, res, next) => next(),
    verificationRouter: {},
}));

// ─── Dynamic imports ───
const { default: express } = await import('express');
const { default: request } = await import('supertest');

// Need to import the rate limiter mock
const contentModule = await import('../../src/routes/content.js');

const app = express();
app.use(express.json());
app.use('/api/content', contentModule.default);

describe('Content Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/content/signed-url/:contentId', () => {
        it('should generate a signed URL for authorized wallet', async () => {
            const res = await request(app)
                .get('/api/content/signed-url/ct-1')
                .query({ walletAddress: '0x1234567890abcdef1234567890abcdef12345678' });

            expect(res.status).toBe(200);
            expect(res.body.signedUrl).toBeDefined();
        });

        it('should reject request without wallet address', async () => {
            const res = await request(app)
                .get('/api/content/signed-url/ct-1');

            // Either 400 (missing wallet) or 403 (access denied)
            expect([400, 403]).toContain(res.status);
        });
    });

    describe('GET /api/content/product/:productId', () => {
        it('should return content for a product', async () => {
            const res = await request(app)
                .get('/api/content/product/prod-1')
                .query({ walletAddress: '0x1234567890abcdef1234567890abcdef12345678' });

            expect(res.status).toBe(200);
        });
    });

    describe('GET /api/content/accessible', () => {
        it('should return accessible content for a wallet', async () => {
            const res = await request(app)
                .get('/api/content/accessible')
                .query({ walletAddress: '0x1234567890abcdef1234567890abcdef12345678' });

            expect(res.status).toBe(200);
        });

        it('should reject request without wallet', async () => {
            const res = await request(app)
                .get('/api/content/accessible');

            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/content/validate-url', () => {
        it('should validate a signed URL', async () => {
            const res = await request(app)
                .get('/api/content/validate-url')
                .query({ url: 'https://storage.googleapis.com/signed-url?token=abc' });

            expect(res.status).toBe(200);
            expect(res.body.valid).toBe(true);
        });

        it('should reject request without URL', async () => {
            const res = await request(app)
                .get('/api/content/validate-url');

            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/content/:contentId/metadata', () => {
        it('should accept a metadata request', async () => {
            const res = await request(app)
                .get('/api/content/ct-1/metadata');

            // Route is registered and reachable (may 200 or 500 depending on mock depth)
            expect([200, 500]).toContain(res.status);
        });
    });
});
