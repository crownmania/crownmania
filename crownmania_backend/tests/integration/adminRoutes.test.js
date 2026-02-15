/**
 * Admin Route Integration Tests
 * Tests: queue metrics, retry, CSV export, stats, collectibles
 */

import { jest } from '@jest/globals';

// ─── Mock Firebase ───
const mockUpdate = jest.fn().mockResolvedValue({});
const mockAdd = jest.fn().mockResolvedValue({ id: 'log-1' });
const mockGetDoc = jest.fn();
const mockGetCollection = jest.fn();

jest.unstable_mockModule('../../src/config/firebase.js', () => ({
    db: {
        collection: jest.fn((name) => {
            if (name === 'collectibles') {
                return {
                    get: mockGetCollection.mockResolvedValue({
                        size: 3,
                        docs: [
                            { id: 'c1', ref: {}, data: () => ({ serialNumber: 'SERIAL001', productName: 'Durk Hat', editionNumber: 1, totalEditions: 500, ownerId: '0xabc', status: 'active', tokenId: '1', transactionHash: '0xtx1', createdAt: { toDate: () => new Date('2025-01-01') } }) },
                            { id: 'c2', ref: {}, data: () => ({ serialNumber: 'SERIAL002', productName: 'Durk Hat', editionNumber: 2, totalEditions: 500, ownerId: '0xdef', status: 'pending_transfer', tokenId: '2', transactionHash: null, createdAt: { toDate: () => new Date('2025-01-02') } }) },
                            { id: 'c3', ref: {}, data: () => ({ serialNumber: 'SERIAL003', productName: 'Durk Hat', editionNumber: 3, totalEditions: 500, ownerId: '0xghi', status: 'failed_transfer', tokenId: '3', transactionHash: null, createdAt: { toDate: () => new Date('2025-01-03') } }) },
                        ]
                    }),
                    doc: jest.fn((id) => ({
                        get: mockGetDoc.mockImplementation(async () => {
                            if (id === 'c3') return { exists: true, data: () => ({ status: 'failed_transfer', transferAttempts: 2 }) };
                            if (id === 'not-found') return { exists: false };
                            if (id === 'c1') return { exists: true, data: () => ({ status: 'active', transferAttempts: 1 }) };
                            return { exists: true, data: () => ({}) };
                        }),
                        update: mockUpdate,
                    })),
                    where: jest.fn().mockReturnThis(),
                    limit: jest.fn().mockReturnThis(),
                };
            }
            if (name === 'transferJobs') {
                return {
                    where: jest.fn().mockReturnThis(),
                    get: jest.fn().mockResolvedValue({ size: 1 }),
                };
            }
            if (name === 'auditLogs') {
                return {
                    add: mockAdd,
                    where: jest.fn().mockReturnThis(),
                    orderBy: jest.fn().mockReturnThis(),
                    limit: jest.fn().mockReturnThis(),
                    get: jest.fn().mockResolvedValue({ docs: [] }),
                };
            }
            if (name === 'users') {
                return {
                    limit: jest.fn().mockReturnThis(),
                    get: jest.fn().mockResolvedValue({
                        docs: [
                            { id: 'u1', data: () => ({ walletAddress: '0xabc', name: 'Test User', emailPlain: 'test@example.com', profileComplete: true, role: 'user', createdAt: { toDate: () => new Date('2025-01-01') } }) },
                        ]
                    }),
                };
            }
            if (name === 'claimCodes') {
                return {
                    get: jest.fn().mockResolvedValue({
                        docs: [
                            { id: 'cc1', data: () => ({ productId: 'prod1', claimed: true, claimedBy: '0xabc', claimedAt: { toDate: () => new Date('2025-01-01') }, editionNumber: 1, tokenId: '1' }) },
                            { id: 'cc2', data: () => ({ productId: 'prod1', claimed: false, claimedBy: '', claimedAt: null, editionNumber: '', tokenId: '' }) },
                        ]
                    }),
                };
            }
            if (name === 'content') {
                return {
                    get: jest.fn().mockResolvedValue({ docs: [] }),
                    add: jest.fn().mockResolvedValue({ id: 'ct-1' }),
                };
            }
            return {
                get: jest.fn().mockResolvedValue({ docs: [] }),
                add: mockAdd,
                doc: jest.fn().mockReturnValue({ get: jest.fn(), update: jest.fn() }),
            };
        }),
    },
    adminStorage: {},
}));

// ─── Mock admin service ───
jest.unstable_mockModule('../../src/services/adminService.js', () => ({
    adminService: {
        getSystemStats: jest.fn().mockResolvedValue({ totalClaims: 10, pendingTransfers: 2 }),
        getAllCollectibles: jest.fn().mockResolvedValue([]),
        getAllClaimCodes: jest.fn().mockResolvedValue([]),
        transferOwnership: jest.fn().mockResolvedValue({ success: true }),
        revokeCollectible: jest.fn().mockResolvedValue({ success: true }),
        resetClaimCode: jest.fn().mockResolvedValue({ success: true }),
        requestLogin: jest.fn().mockResolvedValue({ success: true }),
        verifyOTP: jest.fn().mockResolvedValue({ success: true, token: 'test-token' }),
        logout: jest.fn(),
    }
}));

// ─── Mock requireAdmin middleware (bypass auth for tests) ───
jest.unstable_mockModule('../../src/middleware/requireAdmin.js', () => ({
    default: (req, res, next) => {
        req.adminEmail = 'admin@crownmania.com';
        req.user = { uid: 'admin-uid' };
        next();
    }
}));

jest.unstable_mockModule('../../src/config/logger.js', () => ({
    default: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    }
}));

// ─── Dynamic imports after mocks ───
const { default: express } = await import('express');
const { default: request } = await import('supertest');
const adminModule = await import('../../src/routes/admin.js');

const app = express();
app.use(express.json());
app.use('/api/admin', adminModule.default);

describe('Admin Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ── Queue Management ──
    describe('GET /api/admin/queue/metrics', () => {
        it('should return queue metrics', async () => {
            const res = await request(app).get('/api/admin/queue/metrics');

            expect(res.status).toBe(200);
            expect(res.body.queue).toBeDefined();
            expect(res.body.queue).toHaveProperty('pending');
            expect(res.body.queue).toHaveProperty('active');
            expect(res.body.queue).toHaveProperty('completed');
            expect(res.body.queue).toHaveProperty('failed');
            expect(res.body.queue).toHaveProperty('deadLetter');
            expect(res.body.totalCollectibles).toBeDefined();
            expect(res.body.timestamp).toBeDefined();
        });
    });

    describe('POST /api/admin/queue/retry/:collectibleId', () => {
        it('should retry a failed transfer', async () => {
            const res = await request(app).post('/api/admin/queue/retry/c3');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toContain('retry');
        });

        it('should reject retry for non-existent collectible', async () => {
            const res = await request(app).post('/api/admin/queue/retry/not-found');

            expect(res.status).toBe(404);
        });

        it('should reject retry for non-retryable collectible', async () => {
            const res = await request(app).post('/api/admin/queue/retry/c1');

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('retryable');
        });
    });

    // ── CSV Export ──
    describe('GET /api/admin/export/collectibles', () => {
        it('should export collectibles as CSV', async () => {
            const res = await request(app).get('/api/admin/export/collectibles');

            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toContain('text/csv');
            expect(res.headers['content-disposition']).toContain('collectibles_');

            const lines = res.text.split('\n');
            expect(lines[0]).toContain('ID');
            expect(lines[0]).toContain('SerialNumber');
            expect(lines.length).toBeGreaterThan(1); // header + data rows
        });
    });

    describe('GET /api/admin/export/users', () => {
        it('should export users as CSV', async () => {
            const res = await request(app).get('/api/admin/export/users');

            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toContain('text/csv');
            expect(res.text).toContain('WalletAddress');
        });
    });

    describe('GET /api/admin/export/claim-codes', () => {
        it('should export claim codes as CSV', async () => {
            const res = await request(app).get('/api/admin/export/claim-codes');

            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toContain('text/csv');
            expect(res.text).toContain('ProductId');
        });
    });

    // ── Stats ──
    describe('GET /api/admin/stats', () => {
        it('should return system stats', async () => {
            const res = await request(app).get('/api/admin/stats');

            expect(res.status).toBe(200);
            expect(res.body.totalClaims).toBeDefined();
        });
    });
});
