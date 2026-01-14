import { jest } from '@jest/globals';

// Mock firebase
const mockTransaction = {
    get: jest.fn(),
    set: jest.fn(),
    update: jest.fn()
};

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
                where: jest.fn(() => ({
                    limit: jest.fn(() => ({
                        get: jest.fn()
                    }))
                })),
                get: jest.fn(),
                count: jest.fn(() => ({
                    get: jest.fn()
                }))
            })),
            count: jest.fn(() => ({
                get: jest.fn()
            }))
        })),
        runTransaction: jest.fn((cb) => cb(mockTransaction)),
        batch: jest.fn(() => ({
            set: jest.fn(),
            commit: jest.fn()
        }))
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

import Inventory from '../../src/models/Inventory.js';
import { db } from '../../src/config/firebase.js';

describe('Inventory Model', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('allocateSerial', () => {
        it('should throw error when no serials available', async () => {
            // Mock empty query result
            mockTransaction.get.mockResolvedValue({
                empty: true,
                docs: []
            });

            await expect(Inventory.allocateSerial('durk-pendant', 'order-123'))
                .rejects.toThrow('No available serial numbers');
        });

        it('should allocate a serial and update status', async () => {
            const mockDoc = {
                id: 'inv-123',
                ref: { update: jest.fn() },
                data: () => ({
                    serialNumber: 'abc123',
                    productId: 'durk-pendant',
                    status: 'available',
                    orderId: null
                })
            };

            mockTransaction.get.mockResolvedValue({
                empty: false,
                docs: [mockDoc]
            });

            const result = await Inventory.allocateSerial('durk-pendant', 'order-456');

            expect(result.serialNumber).toBe('abc123');
            expect(result.status).toBe('allocated');
            expect(result.orderId).toBe('order-456');
        });
    });

    describe('findBySerialNumber', () => {
        it('should return null when serial not found', async () => {
            db.collection().where().limit().get.mockResolvedValue({
                empty: true,
                docs: []
            });

            const result = await Inventory.findBySerialNumber('nonexistent');
            expect(result).toBeNull();
        });

        it('should return inventory item when found', async () => {
            const mockData = {
                serialNumber: 'found-serial',
                status: 'available',
                productId: null
            };

            db.collection().where().limit().get.mockResolvedValue({
                empty: false,
                docs: [{
                    id: 'doc-id',
                    data: () => mockData
                }]
            });

            const result = await Inventory.findBySerialNumber('found-serial');
            expect(result).not.toBeNull();
            expect(result.serialNumber).toBe('found-serial');
        });
    });

    describe('markClaimed', () => {
        it('should throw error for non-allocated serial', async () => {
            db.collection().where().limit().get.mockResolvedValue({
                empty: false,
                docs: [{
                    id: 'doc-id',
                    ref: { update: jest.fn() },
                    data: () => ({
                        serialNumber: 'test-serial',
                        status: 'available' // Not allocated
                    })
                }]
            });

            await expect(Inventory.markClaimed('test-serial'))
                .rejects.toThrow('not in allocated status');
        });

        it('should mark allocated serial as claimed', async () => {
            const mockUpdate = jest.fn();

            db.collection().where().limit().get.mockResolvedValue({
                empty: false,
                docs: [{
                    id: 'doc-id',
                    ref: { update: mockUpdate },
                    data: () => ({
                        serialNumber: 'allocated-serial',
                        status: 'allocated',
                        orderId: 'order-123'
                    })
                }]
            });

            const result = await Inventory.markClaimed('allocated-serial');

            expect(result.status).toBe('claimed');
            expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
                status: 'claimed'
            }));
        });
    });

    describe('getAvailableCount', () => {
        it('should return count of available serials', async () => {
            db.collection().where().count().get.mockResolvedValue({
                data: () => ({ count: 42 })
            });

            const count = await Inventory.getAvailableCount();
            expect(count).toBe(42);
        });
    });
});
