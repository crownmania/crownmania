/**
 * Webhook Route Integration Tests
 * Tests: NFT transfer webhook, content drop notification webhook
 */

import { jest } from '@jest/globals';
import crypto from 'crypto';

// ─── Mock all external dependencies with ESM-compatible pattern ───
jest.unstable_mockModule('../../src/config/firebase.js', () => {
    const mockCollection = jest.fn();
    const mockDoc = jest.fn();
    const mockGet = jest.fn();
    const mockUpdate = jest.fn();
    const mockAdd = jest.fn();

    return {
        db: {
            collection: mockCollection.mockReturnValue({
                doc: mockDoc.mockReturnValue({
                    get: mockGet.mockResolvedValue({ exists: true, data: () => ({ ownerId: '0xold', serialNumber: 'abcd1234' }) }),
                    update: mockUpdate.mockResolvedValue({}),
                }),
                where: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                get: mockGet.mockResolvedValue({
                    empty: false,
                    docs: [{
                        id: 'collectible-1',
                        ref: { update: mockUpdate },
                        data: () => ({ ownerId: '0xold', serialNumber: 'abcd1234', contractAddress: '0xcontract', blockchainTokenId: '1' })
                    }]
                }),
                add: mockAdd.mockResolvedValue({ id: 'audit-1' }),
            }),
        },
        adminStorage: {},
        __mocks: { mockCollection, mockDoc, mockGet, mockUpdate, mockAdd },
    };
});

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

jest.unstable_mockModule('../../src/services/notificationService.js', () => ({
    sendContentDropNotification: jest.fn().mockResolvedValue(undefined),
}));

// ─── Dynamic imports after mocks ───
const { default: express } = await import('express');
const { default: request } = await import('supertest');

// Manually import the router
const webhooksModule = await import('../../src/routes/webhooks.js');
const { db } = await import('../../src/config/firebase.js');

const app = express();
app.use(express.json());
app.use('/api/webhooks', webhooksModule.default);

// ─── Helper: generate valid Moralis signature ───
function generateMoralisSignature(body, secret = 'test-webhook-secret') {
    return crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(body))
        .digest('hex');
}

describe('Webhook Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.MORALIS_WEBHOOK_SECRET = 'test-webhook-secret';
        process.env.INTERNAL_API_KEY = 'test-internal-key';
    });

    describe('POST /api/webhooks/nft-transfer', () => {
        const transferBody = {
            confirmed: true,
            chainId: '0x89',
            to: '0xNewOwner0000000000000000000000000000001',
            from: '0xOldOwner0000000000000000000000000000001',
            tokenId: '1',
            contractAddress: '0xcontract',
        };

        it('should process a valid NFT transfer webhook', async () => {
            const signature = generateMoralisSignature(transferBody);

            const res = await request(app)
                .post('/api/webhooks/nft-transfer')
                .set('x-signature', signature)
                .send(transferBody);

            expect(res.status).toBe(200);
            expect(res.body.received).toBe(true);
            expect(res.body.processed).toBe(true);
        });

        it('should reject webhook with invalid signature', async () => {
            const res = await request(app)
                .post('/api/webhooks/nft-transfer')
                .set('x-signature', 'invalid-signature')
                .send(transferBody);

            expect(res.status).toBe(401);
            expect(res.body.error).toBe('Invalid signature');
        });

        it('should reject webhook with missing signature', async () => {
            const res = await request(app)
                .post('/api/webhooks/nft-transfer')
                .send(transferBody);

            expect(res.status).toBe(401);
        });

        it('should skip unconfirmed transfers', async () => {
            const unconfirmedBody = { ...transferBody, confirmed: false };
            const signature = generateMoralisSignature(unconfirmedBody);

            const res = await request(app)
                .post('/api/webhooks/nft-transfer')
                .set('x-signature', signature)
                .send(unconfirmedBody);

            expect(res.status).toBe(200);
            expect(res.body.processed).toBe(false);
        });

        it('should fail-closed when MORALIS_WEBHOOK_SECRET is not set', async () => {
            delete process.env.MORALIS_WEBHOOK_SECRET;

            const res = await request(app)
                .post('/api/webhooks/nft-transfer')
                .set('x-signature', 'any-sig')
                .send(transferBody);

            expect(res.status).toBe(401);
        });
    });

    describe('POST /api/webhooks/content-drop-notify', () => {
        it('should reject unauthorized requests', async () => {
            const res = await request(app)
                .post('/api/webhooks/content-drop-notify')
                .send({ contentId: 'content-1', apiKey: 'wrong-key' });

            expect(res.status).toBe(401);
        });

        it('should reject requests without contentId', async () => {
            const res = await request(app)
                .post('/api/webhooks/content-drop-notify')
                .send({ apiKey: 'test-internal-key' });

            expect(res.status).toBe(400);
        });
    });
});
