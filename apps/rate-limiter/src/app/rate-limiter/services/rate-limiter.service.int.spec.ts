import { NotFoundException } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { RedisModule, RedisToken } from '@nestjs-redis/kit';
import type { RedisClientType } from 'redis';
import { FixedWindowAlgorithm } from '../algorithms/fixed-window';
import { SlidingWindowCounterAlgorithm } from '../algorithms/sliding-window-counter';
import { SlidingWindowLogAlgorithm } from '../algorithms/sliding-window-log';
import { TokenBucketAlgorithm } from '../algorithms/token-bucket';
import { AlgorithmManagerService } from './algorithm-manager.service';
import { RateLimiterService } from './rate-limiter.service';
import { RuleManagerService } from './rule-manager.service';

describe('RateLimiterService (integration)', () => {
  let service: RateLimiterService;
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
      providers: [
        FixedWindowAlgorithm,
        SlidingWindowCounterAlgorithm,
        SlidingWindowLogAlgorithm,
        TokenBucketAlgorithm,
        AlgorithmManagerService,
        RuleManagerService,
        RateLimiterService,
      ],
    }).compile();

    service = module.get<RateLimiterService>(RateLimiterService);
    redis = module.get<RedisClientType>(RedisToken());
    await module.init();
  });

  afterAll(async () => {
    await module.close();
  });

  describe('check', () => {
    it('should use default rule with token-bucket algorithm', async () => {
      const clientId = 'rls-test-client-1';

      // Default rule: token-bucket, limit 100, window 60s
      // Should allow first 100 requests
      const results = [];
      for (let i = 0; i < 100; i++) {
        const result = await service.check(clientId, 'default');
        results.push(result);
      }

      expect(results.every((r) => r.allowed)).toBe(true);
      expect(results[99].remaining).toBe(0);

      // 101st request should be denied
      const denied = await service.check(clientId, 'default');
      expect(denied.allowed).toBe(false);
      expect(denied.limit).toBe(100);
    });

    it('should use api-requests rule with token-bucket algorithm', async () => {
      const clientId = 'rls-test-client-2';

      // api-requests rule: token-bucket, limit 1000, window 3600s
      const result = await service.check(clientId, 'api-requests');
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(1000);
      expect(result.remaining).toBe(999);
    });

    it('should use strict rule with sliding-window-log algorithm', async () => {
      const clientId = 'rls-test-client-3';

      // strict rule: sliding-window-log, limit 10, window 60s
      const results = [];
      for (let i = 0; i < 10; i++) {
        const result = await service.check(clientId, 'strict');
        results.push(result);
      }

      expect(results.every((r) => r.allowed)).toBe(true);
      expect(results[9].remaining).toBe(0);
      expect(results[9].limit).toBe(10);

      // 11th request should be denied
      const denied = await service.check(clientId, 'strict');
      expect(denied.allowed).toBe(false);
      expect(denied.limit).toBe(10);
    });

    it('should throw NotFoundException for invalid rule ID', async () => {
      const clientId = 'rls-test-client-4';

      await expect(
        service.check(clientId, 'non-existent-rule'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.check(clientId, 'non-existent-rule'),
      ).rejects.toThrow('Rate limit rule not found: non-existent-rule');
    });

    it('should handle different client IDs independently', async () => {
      const clientId1 = 'rls-test-client-5';
      const clientId2 = 'rls-test-client-6';

      // Exhaust limit for client 1
      for (let i = 0; i < 10; i++) {
        await service.check(clientId1, 'strict');
      }
      const denied1 = await service.check(clientId1, 'strict');
      expect(denied1.allowed).toBe(false);

      // Client 2 should still be allowed (independent limits)
      const allowed2 = await service.check(clientId2, 'strict');
      expect(allowed2.allowed).toBe(true);
      expect(allowed2.remaining).toBe(9);
    });

    it('should return correct rate limit headers', async () => {
      const clientId = 'rls-test-client-7';
      const beforeTime = Date.now();
      const result = await service.check(clientId, 'default');
      const afterTime = Date.now();

      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('remaining');
      expect(result).toHaveProperty('resetTime');
      expect(typeof result.allowed).toBe('boolean');
      expect(typeof result.limit).toBe('number');
      expect(typeof result.remaining).toBe('number');
      expect(typeof result.resetTime).toBe('number');
      // resetTime should be a valid timestamp (allowing for small timing differences)
      expect(result.resetTime).toBeGreaterThanOrEqual(beforeTime - 1000); // Allow 1s buffer for timing
      expect(result.resetTime).toBeLessThanOrEqual(afterTime + 70000); // Allow 70s buffer for 60s window
    });

    it('should apply correct algorithm for each rule', async () => {
      const clientId = 'rls-test-client-8';

      // Test default rule (token-bucket) - should refill over time
      await service.check(clientId, 'default');
      const result1 = await service.check(clientId, 'default');
      expect(result1.allowed).toBe(true);

      // Test strict rule (sliding-window-log) - strict counting
      const clientId2 = 'rls-test-client-9';
      for (let i = 0; i < 10; i++) {
        await service.check(clientId2, 'strict');
      }
      const denied = await service.check(clientId2, 'strict');
      expect(denied.allowed).toBe(false);
    });

    it('should handle concurrent requests for same client', async () => {
      const clientId = 'rls-test-client-10';

      // Make 5 concurrent requests
      const promises = Array.from({ length: 5 }, () =>
        service.check(clientId, 'strict'),
      );
      const results = await Promise.all(promises);

      // All should be allowed (limit is 10)
      expect(results.every((r) => r.allowed)).toBe(true);
      expect(results.length).toBe(5);

      // Make 5 more to reach limit
      const promises2 = Array.from({ length: 5 }, () =>
        service.check(clientId, 'strict'),
      );
      const results2 = await Promise.all(promises2);

      // All should still be allowed (total 10)
      expect(results2.every((r) => r.allowed)).toBe(true);

      // Next one should be denied
      const denied = await service.check(clientId, 'strict');
      expect(denied.allowed).toBe(false);
    });
  });
});
