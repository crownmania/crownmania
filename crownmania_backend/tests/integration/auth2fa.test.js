/**
 * Integration tests for Auth 2FA routes
 * Verifies all 2FA endpoints are properly registered
 */
import { jest } from '@jest/globals';

// Mock Firebase
jest.mock('../../src/config/firebase.js', () => ({
    db: {
        collection: jest.fn(() => ({
            add: jest.fn().mockResolvedValue({ id: 'mock-id' }),
            doc: jest.fn(() => ({
                update: jest.fn().mockResolvedValue({}),
            })),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn(() => ({
                get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
            })),
            get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
        })),
    },
}));

jest.mock('../../src/config/email.js', () => ({
    sgMail: { send: jest.fn().mockResolvedValue([]) },
    EMAIL_CONFIG: { from: { email: 'test@test.com', name: 'CrownMania' } },
}));

jest.mock('../../src/services/smsService.js', () => ({
    default: {
        sendVerificationCode: jest.fn().mockResolvedValue({ success: true }),
        isValidPhone: jest.fn().mockReturnValue(true),
    },
}));

jest.mock('../../src/services/signatureService.js', () => ({
    default: {
        generateNonce: jest.fn().mockResolvedValue({
            nonce: 'test-nonce',
            message: 'test-message',
            expiresAt: new Date(Date.now() + 300000),
        }),
        verifySignature: jest.fn().mockResolvedValue(true),
    },
}));

jest.mock('../../src/config/logger.js', () => ({
    default: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}));

import { authRouter } from '../../src/routes/auth.js';

describe('Auth 2FA Routes', () => {
    it('should export auth router', () => {
        expect(authRouter).toBeDefined();
    });

    describe('Route definitions', () => {
        const getRoutePaths = () => {
            return authRouter.stack
                .filter(layer => layer.route)
                .map(layer => ({
                    path: layer.route.path,
                    methods: Object.keys(layer.route.methods),
                }));
        };

        it('should have nonce GET endpoint', () => {
            const routes = getRoutePaths();
            const nonceRoute = routes.find(r => r.path === '/nonce');
            expect(nonceRoute).toBeDefined();
            expect(nonceRoute.methods).toContain('get');
        });

        it('should have verify POST endpoint', () => {
            const routes = getRoutePaths();
            const verifyRoute = routes.find(r => r.path === '/verify');
            expect(verifyRoute).toBeDefined();
            expect(verifyRoute.methods).toContain('post');
        });

        it('should have 2FA setup-email endpoint', () => {
            const routes = getRoutePaths();
            expect(routes.find(r => r.path === '/2fa/setup-email')).toBeDefined();
        });

        it('should have 2FA verify-email endpoint', () => {
            const routes = getRoutePaths();
            expect(routes.find(r => r.path === '/2fa/verify-email')).toBeDefined();
        });

        it('should have 2FA setup-phone endpoint', () => {
            const routes = getRoutePaths();
            expect(routes.find(r => r.path === '/2fa/setup-phone')).toBeDefined();
        });

        it('should have 2FA verify-phone endpoint', () => {
            const routes = getRoutePaths();
            expect(routes.find(r => r.path === '/2fa/verify-phone')).toBeDefined();
        });

        it('should have 2FA enable endpoint', () => {
            const routes = getRoutePaths();
            expect(routes.find(r => r.path === '/2fa/enable')).toBeDefined();
        });

        it('should have 2FA disable endpoint', () => {
            const routes = getRoutePaths();
            expect(routes.find(r => r.path === '/2fa/disable')).toBeDefined();
        });

        it('should have 2FA challenge endpoint', () => {
            const routes = getRoutePaths();
            expect(routes.find(r => r.path === '/2fa/challenge')).toBeDefined();
        });

        it('should have 2FA status GET endpoint', () => {
            const routes = getRoutePaths();
            const statusRoute = routes.find(r => r.path === '/2fa/status');
            expect(statusRoute).toBeDefined();
            expect(statusRoute.methods).toContain('get');
        });

        it('should have exactly 10 route handlers', () => {
            const routes = getRoutePaths();
            expect(routes.length).toBe(10);
        });
    });
});
