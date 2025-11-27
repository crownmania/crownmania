import request from 'supertest';
import { createDynamicRateLimiter } from '../../src/middleware/dynamicRateLimiter.js';
import express from 'express';
import Redis from 'ioredis-mock';

jest.mock('ioredis', () => require('ioredis-mock'));

describe('Rate Limiter Middleware', () => {
  let app;
  let redis;

  beforeEach(() => {
    redis = new Redis();
    app = express();
    app.use(express.json());
  });

  afterEach(async () => {
    await redis.flushall();
  });

  describe('API Rate Limiter', () => {
    beforeEach(() => {
      const apiLimiter = createDynamicRateLimiter('api');
      app.use('/api/test', apiLimiter, (req, res) => res.json({ success: true }));
    });

    it('should allow requests within limit', async () => {
      const requests = Array(100).fill().map(() => 
        request(app)
          .get('/api/test')
          .set('X-Forwarded-For', '1.2.3.4')
      );

      const responses = await Promise.all(requests);
      expect(responses.every(res => res.status === 200)).toBe(true);
    });

    it('should block requests over limit', async () => {
      // Make 101 requests (1 over limit)
      const requests = Array(101).fill().map(() =>
        request(app)
          .get('/api/test')
          .set('X-Forwarded-For', '1.2.3.4')
      );

      const responses = await Promise.all(requests);
      const blockedRequests = responses.filter(res => res.status === 429);
      expect(blockedRequests.length).toBe(1);
    });

    it('should apply different limits for verified users', async () => {
      const verifiedUser = { uid: 'test123', verified: true };
      app.use('/api/verified', (req, res, next) => {
        req.user = verifiedUser;
        next();
      }, createDynamicRateLimiter('api'), (req, res) => res.json({ success: true }));

      const requests = Array(200).fill().map(() =>
        request(app)
          .get('/api/verified')
          .set('X-Forwarded-For', '1.2.3.4')
      );

      const responses = await Promise.all(requests);
      expect(responses.filter(res => res.status === 200).length).toBe(200);
    });
  });

  describe('Auth Rate Limiter', () => {
    beforeEach(() => {
      const authLimiter = createDynamicRateLimiter('auth');
      app.use('/auth/login', authLimiter, (req, res) => res.json({ success: true }));
    });

    it('should block after 5 failed attempts', async () => {
      const requests = Array(6).fill().map(() =>
        request(app)
          .post('/auth/login')
          .set('X-Forwarded-For', '1.2.3.4')
      );

      const responses = await Promise.all(requests);
      expect(responses[5].status).toBe(429);
    });
  });

  describe('Minting Rate Limiter', () => {
    beforeEach(() => {
      const mintingLimiter = createDynamicRateLimiter('minting');
      app.use('/api/mint', mintingLimiter, (req, res) => res.json({ success: true }));
    });

    it('should enforce daily minting limits', async () => {
      const requests = Array(26).fill().map(() =>
        request(app)
          .post('/api/mint')
          .set('X-Forwarded-For', '1.2.3.4')
      );

      const responses = await Promise.all(requests);
      expect(responses[25].status).toBe(429);
    });
  });
});
