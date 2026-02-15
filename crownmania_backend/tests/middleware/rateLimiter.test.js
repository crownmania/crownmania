/**
 * Middleware-level Rate Limiter Tests (integration with express app)
 * Uses jest.unstable_mockModule for proper ESM mocking
 */
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// ── Mock ioredis ──
const mockSendCommand = jest.fn().mockResolvedValue('OK');
jest.unstable_mockModule('ioredis', () => ({
  default: jest.fn().mockImplementation(() => ({
    sendCommand: mockSendCommand,
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    ttl: jest.fn().mockResolvedValue(900),
    keys: jest.fn().mockResolvedValue([]),
    del: jest.fn().mockResolvedValue(1),
    on: jest.fn(),
    status: 'ready',
  })),
}));

// ── Mock rate-limit-redis to avoid real Redis ──
jest.unstable_mockModule('rate-limit-redis', () => ({
  default: jest.fn().mockImplementation(() => ({})),
}));

// ── Mock express-rate-limit to return a passthrough middleware ──
let requestCounts = {};
jest.unstable_mockModule('express-rate-limit', () => ({
  default: jest.fn().mockImplementation((opts) => {
    return (req, res, next) => {
      const key = typeof opts.keyGenerator === 'function'
        ? opts.keyGenerator(req)
        : req.ip || '127.0.0.1';

      const skip = opts.skip ? opts.skip(req) : false;
      if (skip) return next();

      requestCounts[key] = (requestCounts[key] || 0) + 1;
      const max = typeof opts.max === 'function' ? opts.max(req) : opts.max;

      if (requestCounts[key] > max) {
        return opts.handler(req, res);
      }
      next();
    };
  }),
}));

// ── Mock logger ──
jest.unstable_mockModule('../../src/config/logger.js', () => ({
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

// Dynamic imports AFTER mocks
const { createDynamicRateLimiter } = await import('../../src/middleware/dynamicRateLimiter.js');
const { default: express } = await import('express');
const { default: request } = await import('supertest');

describe('Rate Limiter Middleware', () => {
  let app;

  beforeEach(() => {
    requestCounts = {};
    app = express();
    app.use(express.json());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('API Rate Limiter', () => {
    beforeEach(() => {
      const apiLimiter = createDynamicRateLimiter('api');
      app.use('/api/test', apiLimiter, (req, res) => res.json({ success: true }));
    });

    it('should allow requests within limit', async () => {
      // API limit is 100 for default users
      const response = await request(app)
        .get('/api/test')
        .set('X-Forwarded-For', '1.2.3.4');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should block requests over limit', async () => {
      // Make 101 requests (fill counter)
      for (let i = 0; i < 101; i++) {
        await request(app)
          .get('/api/test')
          .set('X-Forwarded-For', '1.2.3.4');
      }

      // Should have been blocked on the 101st
      const lastResponse = await request(app)
        .get('/api/test')
        .set('X-Forwarded-For', '1.2.3.4');

      expect(lastResponse.status).toBe(429);
    });
  });

  describe('Auth Rate Limiter', () => {
    beforeEach(() => {
      const authLimiter = createDynamicRateLimiter('auth');
      app.use('/auth/login', authLimiter, (req, res) => res.json({ success: true }));
    });

    it('should block after 5 failed attempts', async () => {
      // Auth limit is 5 for default users
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/auth/login')
          .set('X-Forwarded-For', '1.2.3.4');
      }

      const response = await request(app)
        .post('/auth/login')
        .set('X-Forwarded-For', '1.2.3.4');

      expect(response.status).toBe(429);
    });
  });

  describe('Minting Rate Limiter', () => {
    beforeEach(() => {
      const mintingLimiter = createDynamicRateLimiter('minting');
      app.use('/api/mint', mintingLimiter, (req, res) => res.json({ success: true }));
    });

    it('should enforce daily minting limits', async () => {
      // Minting limit is 25 for default users
      for (let i = 0; i < 25; i++) {
        await request(app)
          .post('/api/mint')
          .set('X-Forwarded-For', '1.2.3.4');
      }

      const response = await request(app)
        .post('/api/mint')
        .set('X-Forwarded-For', '1.2.3.4');

      expect(response.status).toBe(429);
    });
  });
});
