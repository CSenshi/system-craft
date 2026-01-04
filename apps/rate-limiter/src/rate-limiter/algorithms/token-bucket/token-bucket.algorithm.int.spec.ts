import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { RedisModule, RedisToken } from '@nestjs-redis/kit';
import type { RedisClusterType } from 'redis';
import { RateLimitConfig } from '../../rate-limiter.types';
import { TokenBucketAlgorithm } from './token-bucket.algorithm';

describe('TokenBucketAlgorithm (integration)', () => {
  let service: TokenBucketAlgorithm;
  let module: TestingModule;
  let redis: RedisClusterType;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        RedisModule.forRootAsync({
          imports: [ConfigModule.forRoot({ isGlobal: true })],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            type: 'cluster',
            options: {
              rootNodes: [
                { url: configService.getOrThrow<string>('REDIS_HOST') },
              ],
            },
          }),
        }),
      ],
      providers: [TokenBucketAlgorithm],
    }).compile();

    service = module.get<TokenBucketAlgorithm>(TokenBucketAlgorithm);
    redis = module.get<RedisClusterType>(RedisToken());
    await module.init();
  });

  afterAll(async () => {
    await module.close();
  });

  describe('increment', () => {
    const config: RateLimitConfig = {
      limit: 5,
      windowSeconds: 10,
    };

    it('should allow requests within limit', async () => {
      const identifier = 'tb-test-user-1';
      const results = [];
      for (let i = 0; i < 5; i++) {
        const result = await service.increment(identifier, config);
        results.push(result);
        expect(result.allowed).toBe(true);
        expect(result.limit).toBe(5);
        expect(result.remaining).toBeGreaterThanOrEqual(0);
        expect(result.remaining).toBeLessThanOrEqual(5);
      }

      // All should be allowed
      expect(results.every((r) => r.allowed)).toBe(true);
      // Remaining should decrease
      expect(results[0].remaining).toBeGreaterThan(results[4].remaining);
    });

    it('should deny requests when bucket is empty', async () => {
      const identifier = 'tb-test-user-2';
      // Exhaust all tokens
      for (let i = 0; i < config.limit; i++) {
        const result = await service.increment(identifier, config);
        expect(result.allowed).toBe(true);
      }

      // Next request should be denied (bucket empty)
      const result = await service.increment(identifier, config);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should refill tokens over time', async () => {
      const identifier = 'tb-test-user-3';
      const config: RateLimitConfig = {
        limit: 10,
        windowSeconds: 5, // 10 tokens refill in 5 seconds = 2 tokens/second
      };

      // Exhaust all tokens
      for (let i = 0; i < config.limit; i++) {
        await service.increment(identifier, config);
      }

      // Wait for some tokens to refill (2 seconds = 4 tokens)
      await new Promise((resolve) => setTimeout(resolve, 2100));

      // Should be able to make some requests now
      const results = [];
      for (let i = 0; i < 4; i++) {
        const result = await service.increment(identifier, config);
        results.push(result);
      }

      // First few should be allowed (refilled tokens)
      expect(results[0].allowed).toBe(true);
      expect(results[1].allowed).toBe(true);
      expect(results[2].allowed).toBe(true);
      expect(results[3].allowed).toBe(true);

      // Next should be denied (bucket empty again)
      const denied = await service.increment(identifier, config);
      expect(denied.allowed).toBe(false);
    }, 10000);

    it('should handle different identifiers independently', async () => {
      const config: RateLimitConfig = {
        limit: 2,
        windowSeconds: 10,
      };

      // Exhaust limit for user-1
      await service.increment('tb-user-1', config);
      await service.increment('tb-user-1', config);
      const user1Denied = await service.increment('tb-user-1', config);
      expect(user1Denied.allowed).toBe(false);

      // user-2 should still be allowed
      const user2Allowed = await service.increment('tb-user-2', config);
      expect(user2Allowed.allowed).toBe(true);
      expect(user2Allowed.remaining).toBe(1);
    });

    it('should return correct reset time', async () => {
      const identifier = 'tb-test-user-4';
      const result = await service.increment(identifier, config);
      const now = Date.now();

      expect(result.resetTime).toBeGreaterThan(now);
      expect(result.resetTime).toBeLessThanOrEqual(
        now + config.windowSeconds * 1000 + 1000, // Allow 1s tolerance
      );
    });

    it('should handle concurrent requests', async () => {
      const identifier = 'tb-test-user-5';
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
