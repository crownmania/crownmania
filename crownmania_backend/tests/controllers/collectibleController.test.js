/**
 * Unit tests for Collectible model
 * Uses jest.unstable_mockModule for proper ESM mocking
 *
 * NOTE: The original test referenced non-existent modules (app.js, Moralis mint).
 *       Rewritten to test the actual Collectible model against mocked Firestore.
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// ── Mock Firebase + Logger ──
const mockSet = jest.fn().mockResolvedValue(undefined);
const mockUpdate = jest.fn().mockResolvedValue(undefined);
const mockDoc = jest.fn((id) => ({
  set: mockSet,
  update: mockUpdate,
  id: id || 'auto-id',
}));
const mockGet = jest.fn();
const mockWhere = jest.fn().mockReturnThis();
const mockLimit = jest.fn().mockReturnThis();
const mockCollection = jest.fn(() => ({
  doc: mockDoc,
  where: mockWhere,
  limit: mockLimit,
  get: mockGet,
}));

jest.unstable_mockModule('../../src/config/firebase.js', () => ({
  db: { collection: mockCollection },
  admin: {},
}));

jest.unstable_mockModule('../../src/config/logger.js', () => ({
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

// Dynamic import AFTER mocks
const { default: Collectible } = await import('../../src/models/Collectible.js');

describe('Collectible Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockReset();
  });

  describe('create', () => {
    it('should create a collectible and persist to Firestore', async () => {
      const data = {
        id: 'COL-123',
        serialNumber: 'ABC123',
        ownerId: null,
        status: 'unclaimed',
        metadata: { productId: 'durk-pendant' },
      };

      const result = await Collectible.create(data);

      expect(result).toBeInstanceOf(Collectible);
      expect(result.id).toBe('COL-123');
      expect(result.serialNumber).toBe('ABC123');
      expect(result.status).toBe('unclaimed');
      expect(mockCollection).toHaveBeenCalledWith('collectibles');
      expect(mockDoc).toHaveBeenCalledWith('COL-123');
      expect(mockSet).toHaveBeenCalledTimes(1);
    });
  });

  describe('findBySerialNumber', () => {
    it('should return a collectible when found', async () => {
      mockGet.mockResolvedValue({
        empty: false,
        docs: [{
          id: 'COL-999',
          data: () => ({
            serialNumber: 'XYZ789',
            status: 'claimed',
            ownerId: '0xabc',
            metadata: {},
          }),
        }],
      });

      const result = await Collectible.findBySerialNumber('XYZ789');

      expect(result).toBeInstanceOf(Collectible);
      expect(result.serialNumber).toBe('XYZ789');
      expect(result.status).toBe('claimed');
      expect(mockWhere).toHaveBeenCalledWith('serialNumber', '==', 'XYZ789');
    });

    it('should return null for unknown serial', async () => {
      mockGet.mockResolvedValue({ empty: true, docs: [] });

      const result = await Collectible.findBySerialNumber('INVALID');
      expect(result).toBeNull();
    });
  });

  describe('findByOwner', () => {
    it('should return all collectibles for an owner', async () => {
      mockGet.mockResolvedValue({
        docs: [
          { id: 'C1', data: () => ({ serialNumber: 'A', ownerId: '0x1', status: 'claimed', metadata: {} }) },
          { id: 'C2', data: () => ({ serialNumber: 'B', ownerId: '0x1', status: 'minted', metadata: {} }) },
        ],
      });

      const results = await Collectible.findByOwner('0x1');

      expect(results).toHaveLength(2);
      expect(results[0]).toBeInstanceOf(Collectible);
      expect(mockWhere).toHaveBeenCalledWith('ownerId', '==', '0x1');
    });
  });

  describe('updateStatus', () => {
    it('should update status in Firestore', async () => {
      const collectible = new Collectible({
        id: 'COL-555',
        serialNumber: 'UPD',
        status: 'unclaimed',
      });

      const result = await collectible.updateStatus('minted');

      expect(result.status).toBe('minted');
      expect(mockDoc).toHaveBeenCalledWith('COL-555');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'minted' })
      );
    });
  });
});
