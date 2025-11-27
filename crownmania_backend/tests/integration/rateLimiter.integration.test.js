import Redis from 'ioredis';
import request from 'supertest';
import { createDynamicRateLimiter } from '../../src/middleware/dynamicRateLimiter.js';
import express from 'express';

describe('Rate Limiter Integration Tests', () => {
  let app;
  let redis;

  beforeAll(async () => {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      enableOfflineQueue: false,
    });

    // Clear Redis before tests
    await redis.flushall();
  });

  afterAll(async () => {
    await redis.quit();
  });

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('High Concurrency Tests', () => {
    it('should handle concurrent requests correctly', async () => {
      const limiter = createDynamicRateLimiter('api');
      app.use('/api/test', limiter, (req, res) => res.json({ success: true }));

      // Generate 100 concurrent requests
      const requests = Array(100).fill().map(() => 
        request(app)
          .get('/api/test')
          .set('X-Forwarded-For', '1.2.3.4')
      );

      const responses = await Promise.all(requests);
      const successCount = responses.filter(res => res.status === 200).length;
      const limitedCount = responses.filter(res => res.status === 429).length;

      expect(successCount + limitedCount).toBe(100);
      expect(successCount).toBeLessThanOrEqual(100); // Based on rate limit config
    });
  });

  describe('Distributed Rate Limiting', () => {
    it('should maintain limits across multiple server instances', async () => {
      // Simulate two server instances
      const limiter1 = createDynamicRateLimiter('api');
      const limiter2 = createDynamicRateLimiter('api');

      const app1 = express();
      const app2 = express();

      app1.use('/api/test', limiter1, (req, res) => res.json({ success: true }));
      app2.use('/api/test', limiter2, (req, res) => res.json({ success: true }));

      // Make requests to both "servers"
      const requests = Array(150).fill().map((_, i) => 
        request(i % 2 === 0 ? app1 : app2)
          .get('/api/test')
          .set('X-Forwarded-For', '1.2.3.4')
      );

      const responses = await Promise.all(requests);
      const limitedCount = responses.filter(res => res.status === 429).length;

      expect(limitedCount).toBeGreaterThan(0);
    });
  });

  describe('User Type Rate Limits', () => {
    it('should apply different limits for verified users', async () => {
      const limiter = createDynamicRateLimiter('api');
      app.use((req, res, next) => {
        req.user = { verified: true };
        next();
      });
      app.use('/api/test', limiter, (req, res) => res.json({ success: true }));

      const requests = Array(200).fill().map(() => 
        request(app)
          .get('/api/test')
          .set('X-Forwarded-For', '1.2.3.4')
      );

      const responses = await Promise.all(requests);
      const successCount = responses.filter(res => res.status === 200).length;

      expect(successCount).toBeGreaterThan(100); // Verified users have higher limits
    });
  });

  describe('Edge Cases', () => {
    it('should handle Redis connection failure gracefully', async () => {
      const limiter = createDynamicRateLimiter('api');
      app.use('/api/test', limiter, (req, res) => res.json({ success: true }));

      // Force Redis connection failure
      await redis.disconnect();

      const response = await request(app)
        .get('/api/test')
        .set('X-Forwarded-For', '1.2.3.4');

      // Should still work in fail-open mode
      expect(response.status).toBe(200);

      // Restore Redis connection
      await redis.connect();
    });

    it('should handle malformed request IPs', async () => {
      const limiter = createDynamicRateLimiter('api');
      app.use('/api/test', limiter, (req, res) => res.json({ success: true }));

      const response = await request(app)
        .get('/api/test')
        .set('X-Forwarded-For', 'invalid-ip');

      expect(response.status).toBe(200);
    });
  });
});
