import { jest } from '@jest/globals';
import Redis from 'ioredis-mock';
import { createRateLimiter } from '../../src/middleware/dynamicRateLimiter.js';

describe('Rate Limiter Middleware', () => {
  let redis;
  let rateLimiter;
  let req;
  let res;
  let next;

  beforeEach(() => {
    redis = new Redis();
    rateLimiter = createRateLimiter(redis);
    req = {
      ip: '127.0.0.1',
      user: { verified: false }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    redis.flushall();
  });

  it('should allow requests within rate limit', async () => {
    await rateLimiter(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should block requests over rate limit', async () => {
    // Simulate hitting rate limit
    const requests = Array(101).fill().map(() => rateLimiter(req, res, next));
    await Promise.all(requests);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.any(String)
    }));
  });

  it('should apply higher rate limit for verified users', async () => {
    req.user.verified = true;
    
    // Simulate requests just under verified user limit
    const requests = Array(500).fill().map(() => rateLimiter(req, res, next));
    await Promise.all(requests);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should handle Redis errors gracefully', async () => {
    // Simulate Redis error
    redis.incr = jest.fn().mockRejectedValue(new Error('Redis error'));

    await rateLimiter(req, res, next);

    // Should still allow request through on Redis error
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
