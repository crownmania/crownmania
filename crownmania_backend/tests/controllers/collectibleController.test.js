import request from 'supertest';
import app from '../../src/app.js';
import Collectible from '../../src/models/Collectible.js';
import { Moralis } from '../../src/config/web3.js';

jest.mock('../../src/models/Collectible.js');
jest.mock('axios');

describe('Collectible Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/collectibles/verify', () => {
    it('should verify a valid serial number', async () => {
      const mockCollectible = {
        serialNumber: 'ABC123',
        status: 'unclaimed',
        metadata: { name: 'Test Collectible' }
      };

      Collectible.findBySerialNumber.mockResolvedValue(mockCollectible);

      const response = await request(app)
        .post('/api/collectibles/verify')
        .send({
          serialNumber: 'ABC123',
          recaptchaToken: 'valid-token'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        valid: true,
        status: 'unclaimed',
        metadata: { name: 'Test Collectible' }
      });
    });

    it('should return 404 for invalid serial number', async () => {
      Collectible.findBySerialNumber.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/collectibles/verify')
        .send({
          serialNumber: 'INVALID',
          recaptchaToken: 'valid-token'
        });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: 'Invalid serial number'
      });
    });
  });

  describe('POST /api/collectibles/mint', () => {
    it('should mint NFT successfully', async () => {
      const mockCollectible = {
        serialNumber: 'ABC123',
        status: 'claimed',
        ownerId: 'user123',
        metadata: { name: 'Test Collectible' },
        updateStatus: jest.fn(),
        save: jest.fn()
      };

      Collectible.findBySerialNumber.mockResolvedValue(mockCollectible);
      
      Moralis.EvmApi.nft.mint.mockResolvedValue({
        result: {
          tokenId: '1',
          transactionHash: '0x123'
        }
      });

      const response = await request(app)
        .post('/api/collectibles/mint')
        .set('Authorization', 'Bearer valid-token')
        .send({
          serialNumber: 'ABC123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'NFT minted successfully',
        tokenId: '1',
        transactionHash: '0x123'
      });
      expect(mockCollectible.updateStatus).toHaveBeenCalledWith('minted');
    });
  });
});
