/**
 * Unit tests for Inventory Model
 * Uses jest.unstable_mockModule for proper ESM mocking
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// ── Mock Firebase ──
const mockTransaction = {
    get: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
};

const mockUpdate = jest.fn();
const mockGet = jest.fn();
const mockDoc = jest.fn(() => ({ set: jest.fn(), update: mockUpdate, get: mockGet }));
const mockLimit = jest.fn(() => ({ get: mockGet }));
const mockWhere2 = jest.fn(() => ({ limit: mockLimit }));
const mockWhere = jest.fn(() => ({
    limit: mockLimit,
    where: mockWhere2,
    get: mockGet,
    count: jest.fn(() => ({ get: mockGet })),
}));
const mockCount = jest.fn(() => ({ get: mockGet }));
const mockCollection = jest.fn(() => ({
    doc: mockDoc,
    where: mockWhere,
    count: mockCount,
}));

jest.unstable_mockModule('../../src/config/firebase.js', () => ({
    db: {
        collection: mockCollection,
        runTransaction: jest.fn((cb) => cb(mockTransaction)),
        batch: jest.fn(() => ({ set: jest.fn(), commit: jest.fn() })),
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

// Dynamic import AFTER mocks
const { default: Inventory } = await import('../../src/models/Inventory.js');
const { db } = await import('../../src/config/firebase.js');

describe('Inventory Model', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGet.mockReset();
        mockTransaction.get.mockReset();
    });

    describe('allocateSerial', () => {
        it('should throw error when no serials available', async () => {
            mockTransaction.get.mockResolvedValue({
                empty: true,
                docs: [],
            });

            await expect(Inventory.allocateSerial('durk-pendant', 'order-123'))
                .rejects.toThrow('No available serial numbers');
        });

        it('should allocate a serial and update status', async () => {
            const mockDocData = {
                id: 'inv-123',
                ref: { update: jest.fn() },
                data: () => ({
                    serialNumber: 'abc123',
                    productId: 'durk-pendant',
                    status: 'available',
                    orderId: null,
                }),
            };

            mockTransaction.get.mockResolvedValue({
                empty: false,
                docs: [mockDocData],
            });

            const result = await Inventory.allocateSerial('durk-pendant', 'order-456');

            expect(result.serialNumber).toBe('abc123');
            expect(result.status).toBe('allocated');
            expect(result.orderId).toBe('order-456');
        });
    });

    describe('findBySerialNumber', () => {
        it('should return null when serial not found', async () => {
            mockGet.mockResolvedValue({
                empty: true,
                docs: [],
            });

            const result = await Inventory.findBySerialNumber('nonexistent');
            expect(result).toBeNull();
        });

        it('should return inventory item when found', async () => {
            const mockData = {
                serialNumber: 'found-serial',
                status: 'available',
                productId: null,
            };

            mockGet.mockResolvedValue({
                empty: false,
                docs: [{
                    id: 'doc-id',
                    data: () => mockData,
                }],
            });

            const result = await Inventory.findBySerialNumber('found-serial');
            expect(result).not.toBeNull();
            expect(result.serialNumber).toBe('found-serial');
        });
    });

    describe('markClaimed', () => {
        it('should throw error for non-allocated serial', async () => {
            mockGet.mockResolvedValue({
                empty: false,
                docs: [{
                    id: 'doc-id',
                    ref: { update: jest.fn() },
                    data: () => ({
                        serialNumber: 'test-serial',
                        status: 'available', // Not allocated
                    }),
                }],
            });

            await expect(Inventory.markClaimed('test-serial'))
                .rejects.toThrow('not in allocated status');
        });

        it('should mark allocated serial as claimed', async () => {
            const mockUpdateFn = jest.fn();

            mockGet.mockResolvedValue({
                empty: false,
                docs: [{
                    id: 'doc-id',
                    ref: { update: mockUpdateFn },
                    data: () => ({
                        serialNumber: 'allocated-serial',
                        status: 'allocated',
                        orderId: 'order-123',
                    }),
                }],
            });

            const result = await Inventory.markClaimed('allocated-serial');

            expect(result.status).toBe('claimed');
            expect(mockUpdateFn).toHaveBeenCalledWith(expect.objectContaining({
                status: 'claimed',
            }));
        });
    });

    describe('getAvailableCount', () => {
        it('should return count of available serials', async () => {
            mockGet.mockResolvedValue({
                data: () => ({ count: 42 }),
            });

            const count = await Inventory.getAvailableCount();
            expect(count).toBe(42);
        });
    });
});
