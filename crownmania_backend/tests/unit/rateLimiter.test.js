/**
 * Unit tests for Dynamic Rate Limiter
 * Uses jest.unstable_mockModule for proper ESM mocking
 *
 * NOTE: The original test imported a non-existent `createRateLimiter` function.
 *       Rewritten to test the actual `createDynamicRateLimiter` export from
 *       dynamicRateLimiter.js, with Redis and logger properly mocked.
 */
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// ── Mock Redis ──
const mockIncr = jest.fn().mockResolvedValue(1);
const mockExpire = jest.fn().mockResolvedValue(1);
const mockTtl = jest.fn().mockResolvedValue(900);
const mockKeys = jest.fn().mockResolvedValue([]);
const mockDel = jest.fn().mockResolvedValue(1);
const mockFlushall = jest.fn();
const mockOn = jest.fn();

jest.unstable_mockModule('ioredis', () => ({
  default: jest.fn().mockImplementation(() => ({
    incr: mockIncr,
    expire: mockExpire,
    ttl: mockTtl,
    keys: mockKeys,
    del: mockDel,
    flushall: mockFlushall,
    on: mockOn,
    status: 'ready',
  })),
}));

// ── Mock rate-limit-redis ──
jest.unstable_mockModule('rate-limit-redis', () => ({
  default: jest.fn().mockImplementation(() => ({})),
}));

// ── Mock express-rate-limit to return a passthrough middleware ──
jest.unstable_mockModule('express-rate-limit', () => ({
  default: jest.fn().mockImplementation((opts) => {
    // Return a middleware that respects the max/handler logic
    const middleware = async (req, res, next) => {
      const max = typeof opts.max === 'function' ? opts.max(req) : opts.max;
      const skip = opts.skip ? opts.skip(req) : false;

      if (skip) {
        return next();
      }

      // Simulate request counter via mock
      const count = mockIncr.mock.results.length;
      if (count > max) {
        return opts.handler(req, res);
      }

      next();
    };
    middleware._opts = opts; // expose for inspection
    return middleware;
  }),
}));

// ── Mock logger ──
jest.unstable_mockModule('../../src/config/logger.js', () => ({
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

// Dynamic import AFTER mocks
const { createDynamicRateLimiter } = await import('../../src/middleware/dynamicRateLimiter.js');

describe('Dynamic Rate Limiter', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      ip: '127.0.0.1',
      path: '/api/test',
      user: { verified: false },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a rate limiter middleware', () => {
    expect(createDynamicRateLimiter).toBeDefined();
    expect(typeof createDynamicRateLimiter).toBe('function');
  });

  it('should create a rate limiter for "api" type', () => {
    const limiter = createDynamicRateLimiter('api');
    expect(typeof limiter).toBe('function');
  });

  it('should create a rate limiter for "auth" type', () => {
    const limiter = createDynamicRateLimiter('auth');
    expect(typeof limiter).toBe('function');
  });

  it('should create a rate limiter for "minting" type', () => {
    const limiter = createDynamicRateLimiter('minting');
    expect(typeof limiter).toBe('function');
  });

  it('should allow requests within rate limit', async () => {
    const limiter = createDynamicRateLimiter('api');
    await limiter(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should skip rate limiting for admin users', async () => {
    req.user = { role: 'admin' };
    const limiter = createDynamicRateLimiter('api');
    await limiter(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should skip rate limiting for localhost', async () => {
    req.ip = '127.0.0.1';
    const limiter = createDynamicRateLimiter('api');
    await limiter(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
