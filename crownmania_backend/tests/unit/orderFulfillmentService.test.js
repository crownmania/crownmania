import { jest } from '@jest/globals';

// Mock firebase
jest.mock('../../src/config/firebase.js', () => ({
    db: {
        collection: jest.fn(() => ({
            doc: jest.fn(() => ({
                set: jest.fn(),
                update: jest.fn(),
                get: jest.fn()
            })),
            where: jest.fn(() => ({
                limit: jest.fn(() => ({
                    get: jest.fn()
                })),
                get: jest.fn()
            })),
            count: jest.fn(() => ({
                get: jest.fn(() => Promise.resolve({ data: () => ({ count: 0 }) }))
            }))
        })),
        runTransaction: jest.fn()
    }
}));

// Mock Stripe
jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => ({
        checkout: {
            sessions: {
                listLineItems: jest.fn()
            }
        }
    }));
});

// Mock email
jest.mock('../../src/config/email.js', () => ({
    sgMail: {
        send: jest.fn()
    },
    EMAIL_TEMPLATES: {
        ORDER_CONFIRMATION: 'template-id'
    },
    EMAIL_CONFIG: {
        from: 'test@example.com'
    }
}));

// Mock logger
jest.mock('../../src/config/logger.js', () => ({
    default: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
    }
}));

import { orderFulfillmentService } from '../../src/services/orderFulfillmentService.js';
import { db } from '../../src/config/firebase.js';

describe('OrderFulfillmentService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('fulfillOrder', () => {
        it('should skip already processed sessions (idempotency)', async () => {
            const mockSession = {
                id: 'cs_test_123',
                customer_email: 'test@example.com',
                payment_intent: 'pi_123'
            };

            // Mock finding existing order
            db.collection().where().limit().get.mockResolvedValue({
                empty: false,
                docs: [{ id: 'existing-order', data: () => ({ id: 'existing-order' }) }]
            });

            const result = await orderFulfillmentService.fulfillOrder(mockSession);

            expect(result.success).toBe(true);
            expect(result.skipped).toBe(true);
            expect(result.message).toBe('Order already processed');
        });

        it('should throw error when no line items found', async () => {
            const mockSession = {
                id: 'cs_test_456',
                customer_email: 'test@example.com'
            };

            // Mock no existing order
            db.collection().where().limit().get.mockResolvedValue({
                empty: true
            });

            // Mock empty line items
            const Stripe = (await import('stripe')).default;
            const stripeInstance = new Stripe();
            stripeInstance.checkout.sessions.listLineItems.mockResolvedValue({
                data: []
            });

            await expect(orderFulfillmentService.fulfillOrder(mockSession))
                .rejects.toThrow('No line items found');
        });
    });

    describe('findOrderBySessionId', () => {
        it('should return null when no order exists', async () => {
            db.collection().where().limit().get.mockResolvedValue({
                empty: true
            });

            const result = await orderFulfillmentService.findOrderBySessionId('cs_nonexistent');
            expect(result).toBeNull();
        });

        it('should return order when exists', async () => {
            const mockOrderData = {
                id: 'order-123',
                stripeSessionId: 'cs_test_789',
                status: 'paid'
            };

            db.collection().where().limit().get.mockResolvedValue({
                empty: false,
                docs: [{
                    id: 'order-123',
                    data: () => mockOrderData
                }]
            });

            const result = await orderFulfillmentService.findOrderBySessionId('cs_test_789');
            expect(result).not.toBeNull();
            expect(result.id).toBe('order-123');
        });
    });

    describe('getFulfillmentStatus', () => {
        it('should return fulfilled: false for non-existent session', async () => {
            db.collection().where().limit().get.mockResolvedValue({
                empty: true
            });

            const result = await orderFulfillmentService.getFulfillmentStatus('cs_nonexistent');
            expect(result.fulfilled).toBe(false);
            expect(result.order).toBeNull();
        });

        it('should return fulfillment status for existing order', async () => {
            const mockOrder = {
                id: 'order-456',
                status: 'paid',
                entitlementStatus: 'allocated',
                allocatedSerials: ['serial1', 'serial2']
            };

            db.collection().where().limit().get.mockResolvedValue({
                empty: false,
                docs: [{
                    id: 'order-456',
                    data: () => mockOrder
                }]
            });

            const result = await orderFulfillmentService.getFulfillmentStatus('cs_test_status');
            expect(result.fulfilled).toBe(true);
            expect(result.orderId).toBe('order-456');
            expect(result.allocatedSerials).toBe(2);
        });
    });
});
