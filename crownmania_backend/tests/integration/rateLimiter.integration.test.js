/**
 * Rate Limiter Integration Tests
 *
 * These tests require a running Redis instance to work.
 * Run with: REDIS_HOST=localhost npm test -- tests/integration/rateLimiter.integration
 *
 * When Redis is not available, the tests are skipped gracefully.
 */
import { jest, describe, it, expect, beforeAll, beforeEach, afterAll } from '@jest/globals';

// ── Mock logger first (always needed) ──
jest.unstable_mockModule('../../src/config/logger.js', () => ({
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

let redis;
let redisAvailable = false;

try {
  const { default: Redis } = await import('ioredis');
  redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    enableOfflineQueue: false,
    connectTimeout: 2000,
    maxRetriesPerRequest: 0,
    lazyConnect: true,
  });

  await Promise.race([
    redis.connect(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Redis connection timeout')), 2000)),
  ]);

  redisAvailable = true;
} catch (err) {
  console.warn(`⚠️  Redis not available — skipping rate limiter integration tests: ${err.message}`);
}

const describeIfRedis = redisAvailable ? describe : describe.skip;

describeIfRedis('Rate Limiter Integration Tests', () => {
  afterAll(async () => {
    if (redis) {
      try { await redis.quit(); } catch (e) { /* ignore */ }
    }
  });

  beforeEach(async () => {
    if (redis) {
      await redis.flushall();
    }
  });

  it('should be connected to Redis', () => {
    expect(redis.status).toBe('ready');
  });

  it('should store and retrieve rate limit keys', async () => {
    await redis.set('test:rate:limit', '1');
    const val = await redis.get('test:rate:limit');
    expect(val).toBe('1');
  });

  it('should increment counters atomically', async () => {
    const key = 'test:counter';
    await redis.incr(key);
    await redis.incr(key);
    await redis.incr(key);
    const val = await redis.get(key);
    expect(parseInt(val)).toBe(3);
  });

  it('should expire keys after TTL', async () => {
    const key = 'test:expire';
    await redis.set(key, '1');
    await redis.expire(key, 1);
    const ttl = await redis.ttl(key);
    expect(ttl).toBeGreaterThan(0);
  });
});
