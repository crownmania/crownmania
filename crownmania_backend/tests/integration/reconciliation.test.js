/**
 * Reconciliation Job Integration Tests
 * Tests: ownership reconciliation between Firestore DB and on-chain state
 */

import { jest } from '@jest/globals';

// ─── Mock Firebase ───
const mockUpdate = jest.fn().mockResolvedValue({});
const mockAdd = jest.fn().mockResolvedValue({ id: 'log-1' });

jest.unstable_mockModule('../../src/config/firebase.js', () => ({
    db: {
        collection: jest.fn((name) => {
            if (name === 'collectibles') {
                return {
                    where: jest.fn().mockReturnThis(),
                    get: jest.fn().mockResolvedValue({
                        docs: [
                            {
                                id: 'c1',
                                data: () => ({
                                    ownerId: '0xowner1',
                                    contractAddress: '0xcontract',
                                    blockchainTokenId: '1',
                                    serialNumber: 'SERIAL001',
                                    status: 'claimed'
                                })
                            },
                            {
                                id: 'c2',
                                data: () => ({
                                    ownerId: '0xowner2',
                                    contractAddress: '0xcontract',
                                    blockchainTokenId: '2',
                                    serialNumber: 'SERIAL002',
                                    status: 'transferred'
                                })
                            },
                            {
                                id: 'c3-no-chain',
                                data: () => ({
                                    ownerId: '0xowner3',
                                    contractAddress: null,
                                    blockchainTokenId: null,
                                    serialNumber: 'SERIAL003',
                                    status: 'claimed'
                                })
                            },
                        ]
                    }),
                    doc: jest.fn().mockReturnValue({
                        update: mockUpdate,
                    }),
                };
            }
            if (name === 'auditLogs') {
                return {
                    add: mockAdd,
                };
            }
            return {
                get: jest.fn().mockResolvedValue({ docs: [] }),
                add: mockAdd,
            };
        }),
    },
    adminStorage: {},
}));

jest.unstable_mockModule('../../src/config/logger.js', () => ({
    default: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    }
}));

// ─── Mock ownershipService ───
const mockCheckNFTOwnership = jest.fn();
jest.unstable_mockModule('../../src/services/ownershipService.js', () => ({
    default: {
        checkNFTOwnership: mockCheckNFTOwnership,
        verifyOwnership: jest.fn(),
        getWalletNFTs: jest.fn(),
    },
    ownershipService: {
        checkNFTOwnership: mockCheckNFTOwnership,
        verifyOwnership: jest.fn(),
        getWalletNFTs: jest.fn(),
    },
}));

// ─── Dynamic imports ───
const { default: reconcileOwnership } = await import('../../src/jobs/reconcileOwnership.js');

describe('Reconciliation Job', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should detect and fix ownership mismatches', async () => {
        // c1: owner matches on-chain → no update
        // c2: owner does NOT match on-chain → should update
        mockCheckNFTOwnership
            .mockResolvedValueOnce('0xowner1') // c1 matches
            .mockResolvedValueOnce('0xnewowner2'); // c2 mismatch

        const result = await reconcileOwnership();

        expect(result.processed).toBe(2); // c3 skipped (no chain data)
        expect(result.synced).toBe(1); // c1 in sync
        expect(result.mismatches).toBe(1); // c2 mismatch fixed
        expect(result.errors).toBe(0);

        // Should have updated c2's owner in DB
        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                ownerId: '0xnewowner2',
                status: 'transferred',
            })
        );

        // Should have logged the mismatch
        expect(mockAdd).toHaveBeenCalledWith(
            expect.objectContaining({
                event: 'ownership_mismatch_reconciled',
            })
        );
    });

    it('should handle chain lookup errors gracefully', async () => {
        mockCheckNFTOwnership
            .mockRejectedValueOnce(new Error('RPC timeout'))
            .mockResolvedValueOnce('0xowner2');

        const result = await reconcileOwnership();

        expect(result.errors).toBe(1); // c1 errored
        expect(result.synced).toBe(1); // c2 in sync
        expect(result.processed).toBe(1); // only c2 fully processed (c1 errored before increment)
    });

    it('should skip collectibles without blockchain data', async () => {
        mockCheckNFTOwnership
            .mockResolvedValueOnce('0xowner1')
            .mockResolvedValueOnce('0xowner2');

        const result = await reconcileOwnership();

        // c3 has no contractAddress/blockchainTokenId → skipped
        expect(result.processed).toBe(2);
        expect(mockCheckNFTOwnership).toHaveBeenCalledTimes(2);
    });

    it('should log job completion in audit logs', async () => {
        mockCheckNFTOwnership
            .mockResolvedValueOnce('0xowner1')
            .mockResolvedValueOnce('0xowner2');

        await reconcileOwnership();

        expect(mockAdd).toHaveBeenCalledWith(
            expect.objectContaining({
                event: 'ownership_reconciliation_completed',
                stats: expect.objectContaining({
                    processed: expect.any(Number),
                    synced: expect.any(Number),
                    mismatches: expect.any(Number),
                    errors: expect.any(Number),
                }),
            })
        );
    });
});
