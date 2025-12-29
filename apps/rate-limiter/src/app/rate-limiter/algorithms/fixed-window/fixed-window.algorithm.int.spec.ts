import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { RedisModule, RedisToken } from '@nestjs-redis/kit';
import type { RedisClientType } from 'redis';
import { RateLimitConfig } from '../../rate-limiter.types';
import { FixedWindowAlgorithm } from './fixed-window.algorithm';

describe('FixedWindowAlgorithm (integration)', () => {
  let service: FixedWindowAlgorithm;
  let module: TestingModule;
  let redis: RedisClientType;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        RedisModule.forRootAsync({
          imports: [ConfigModule.forRoot({ isGlobal: true })],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            options: { url: configService.getOrThrow<string>('REDIS_HOST') },
          }),
        }),
      ],
      providers: [FixedWindowAlgorithm],
    }).compile();

    service = module.get<FixedWindowAlgorithm>(FixedWindowAlgorithm);
    redis = module.get<RedisClientType>(RedisToken());
    await module.init();
  });

  beforeEach(async () => {
    // Clear Redis database before each test for isolation
    await redis.flushDb();
  });

  afterAll(async () => {
    await module.close();
  });

  describe('increment', () => {
    const config: RateLimitConfig = {
      limit: 3,
      windowSeconds: 10,
    };

    it('should allow requests within limit', async () => {
      const identifier = 'test-user-1';
      const results = [];
      for (let i = 0; i < 3; i++) {
        const result = await service.increment(identifier, config);
        results.push(result);
        expect(result.allowed).toBe(true);
        expect(result.limit).toBe(3);
        expect(result.remaining).toBeGreaterThanOrEqual(0);
        expect(result.remaining).toBeLessThanOrEqual(3);
      }

      // All should be allowed
      expect(results.every((r) => r.allowed)).toBe(true);
      // Remaining should decrease
      expect(results[0].remaining).toBeGreaterThan(results[2].remaining);
    });

    it('should deny requests when limit is exceeded', async () => {
      const identifier = 'test-user-2';
      // Make requests up to the limit
      for (let i = 0; i < config.limit; i++) {
        const result = await service.increment(identifier, config);
        expect(result.allowed).toBe(true);
      }

      // Next request should be denied
      const result = await service.increment(identifier, config);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should reset after window expires', async () => {
      const identifier = 'test-user-3';
      const config: RateLimitConfig = {
        limit: 2,
        windowSeconds: 2, // 2 second window for faster testing
      };

      // Exhaust the limit
      await service.increment(identifier, config);
      await service.increment(identifier, config);
      const denied = await service.increment(identifier, config);
      expect(denied.allowed).toBe(false);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 2100));

      // Should be allowed again
      const allowed = await service.increment(identifier, config);
      expect(allowed.allowed).toBe(true);
      expect(allowed.remaining).toBeGreaterThan(0);
    }, 10000); // Increase timeout for this test

    it('should handle different identifiers independently', async () => {
      const config: RateLimitConfig = {
        limit: 2,
        windowSeconds: 10,
      };

      // Exhaust limit for user-1
      await service.increment('user-1', config);
      await service.increment('user-1', config);
      const user1Denied = await service.increment('user-1', config);
      expect(user1Denied.allowed).toBe(false);

      // user-2 should still be allowed
      const user2Allowed = await service.increment('user-2', config);
      expect(user2Allowed.allowed).toBe(true);
      expect(user2Allowed.remaining).toBe(1);
    });

    it('should return correct reset time', async () => {
      const identifier = 'test-user-4';
      const result = await service.increment(identifier, config);
      const now = Date.now();

      expect(result.resetTime).toBeGreaterThan(now);
      expect(result.resetTime).toBeLessThanOrEqual(
        now + config.windowSeconds * 1000,
      );
    });

    it('should handle concurrent requests', async () => {
      const identifier = 'test-user-5';
      const config: RateLimitConfig = {
        limit: 10,
        windowSeconds: 10,
      };

      // Make concurrent requests
      const promises = Array.from({ length: 5 }, () =>
        service.increment(identifier, config),
      );
      const results = await Promise.all(promises);

      // All should be allowed (within limit)
      expect(results.every((r) => r.allowed)).toBe(true);
      // Total remaining should account for all requests
      const totalUsed = results.reduce(
        (sum, r) => sum + (config.limit - r.remaining),
        0,
      );
      expect(totalUsed).toBeGreaterThanOrEqual(5);
    });
  });
});
