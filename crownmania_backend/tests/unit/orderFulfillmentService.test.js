/**
 * Unit tests for OrderFulfillmentService
 * Uses jest.unstable_mockModule for proper ESM mocking
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// ── Mock Firebase ──
const mockSet = jest.fn();
const mockUpdate = jest.fn();
const mockGet = jest.fn();
const mockDoc = jest.fn(() => ({ set: mockSet, update: mockUpdate, get: mockGet }));
const mockLimit = jest.fn(() => ({ get: mockGet }));
const mockWhere = jest.fn(() => ({ limit: mockLimit, get: mockGet }));
const mockCount = jest.fn(() => ({ get: jest.fn(() => Promise.resolve({ data: () => ({ count: 0 }) })) }));
const mockCollection = jest.fn(() => ({
    doc: mockDoc,
    where: mockWhere,
    count: mockCount,
}));

jest.unstable_mockModule('../../src/config/firebase.js', () => ({
    db: {
        collection: mockCollection,
        runTransaction: jest.fn(),
    },
}));

// ── Mock Stripe ──
const mockListLineItems = jest.fn();
jest.unstable_mockModule('stripe', () => ({
    default: jest.fn().mockImplementation(() => ({
        checkout: {
            sessions: {
                listLineItems: mockListLineItems,
            },
        },
    })),
}));

// ── Mock email ──
jest.unstable_mockModule('../../src/config/email.js', () => ({
    sgMail: { send: jest.fn() },
    EMAIL_TEMPLATES: { ORDER_CONFIRMATION: 'template-id' },
    EMAIL_CONFIG: { from: 'test@example.com' },
}));

// ── Mock logger ──
jest.unstable_mockModule('../../src/config/logger.js', () => ({
    default: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));

// ── Mock models (they import firebase internally) ──
jest.unstable_mockModule('../../src/models/Order.js', () => ({
    default: { create: jest.fn() },
}));
jest.unstable_mockModule('../../src/models/Inventory.js', () => ({
    default: { allocateSerial: jest.fn() },
}));
jest.unstable_mockModule('../../src/models/Collectible.js', () => ({
    default: { create: jest.fn() },
}));

// Dynamic imports AFTER mocks
const { orderFulfillmentService } = await import('../../src/services/orderFulfillmentService.js');
const { db } = await import('../../src/config/firebase.js');

describe('OrderFulfillmentService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('fulfillOrder', () => {
        it('should skip already processed sessions (idempotency)', async () => {
            const mockSession = {
                id: 'cs_test_123',
                customer_email: 'test@example.com',
                payment_intent: 'pi_123',
            };

            // Mock finding existing order
            mockGet.mockResolvedValue({
                empty: false,
                docs: [{ id: 'existing-order', data: () => ({ id: 'existing-order' }) }],
            });

            const result = await orderFulfillmentService.fulfillOrder(mockSession);

            expect(result.success).toBe(true);
            expect(result.skipped).toBe(true);
            expect(result.message).toBe('Order already processed');
        });

        it('should throw error when no line items found', async () => {
            const mockSession = {
                id: 'cs_test_456',
                customer_email: 'test@example.com',
            };

            // Mock no existing order
            mockGet.mockResolvedValue({ empty: true });

            // Mock empty line items
            mockListLineItems.mockResolvedValue({ data: [] });

            await expect(orderFulfillmentService.fulfillOrder(mockSession))
                .rejects.toThrow('No line items found');
        });
    });

    describe('findOrderBySessionId', () => {
        it('should return null when no order exists', async () => {
            mockGet.mockResolvedValue({ empty: true });

            const result = await orderFulfillmentService.findOrderBySessionId('cs_nonexistent');
            expect(result).toBeNull();
        });

        it('should return order when exists', async () => {
            const mockOrderData = {
                id: 'order-123',
                stripeSessionId: 'cs_test_789',
                status: 'paid',
            };

            mockGet.mockResolvedValue({
                empty: false,
                docs: [{
                    id: 'order-123',
                    data: () => mockOrderData,
                }],
            });

            const result = await orderFulfillmentService.findOrderBySessionId('cs_test_789');
            expect(result).not.toBeNull();
            expect(result.id).toBe('order-123');
        });
    });

    describe('getFulfillmentStatus', () => {
        it('should return fulfilled: false for non-existent session', async () => {
            mockGet.mockResolvedValue({ empty: true });

            const result = await orderFulfillmentService.getFulfillmentStatus('cs_nonexistent');
            expect(result.fulfilled).toBe(false);
            expect(result.order).toBeNull();
        });

        it('should return fulfillment status for existing order', async () => {
            const mockOrder = {
                id: 'order-456',
                status: 'paid',
                entitlementStatus: 'allocated',
                allocatedSerials: ['serial1', 'serial2'],
            };

            mockGet.mockResolvedValue({
                empty: false,
                docs: [{
                    id: 'order-456',
                    data: () => mockOrder,
                }],
            });

            const result = await orderFulfillmentService.getFulfillmentStatus('cs_test_status');
            expect(result.fulfilled).toBe(true);
            expect(result.orderId).toBe('order-456');
            expect(result.allocatedSerials).toBe(2);
        });
    });
});
