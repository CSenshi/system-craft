import { NotFoundException } from '@nestjs/common';
import type { IRateLimitAlgorithm } from '../algorithms/base';
import type { RateLimitResult } from '../rate-limiter.types';
import { AlgorithmManagerService } from './algorithm-manager.service';
import { RateLimiterService } from './rate-limiter.service';
import { RuleManagerService } from './rule-manager.service';

describe('RateLimiterService', () => {
  let service: RateLimiterService;
  let ruleManager: jest.Mocked<RuleManagerService>;
  let algorithmManager: jest.Mocked<AlgorithmManagerService>;

  const mockResult: RateLimitResult = {
    allowed: true,
    limit: 100,
    remaining: 99,
    resetTime: Date.now() + 60_000,
  };

  const mockAlgorithm: jest.Mocked<IRateLimitAlgorithm> = {
    increment: jest.fn().mockResolvedValue(mockResult),
  };

  beforeEach(() => {
    ruleManager = {
      getRule: jest.fn().mockReturnValue({
        algorithm: 'token-bucket',
        limit: 100,
        windowSeconds: 60,
      }),
    } as any;

    algorithmManager = {
      getAlgorithm: jest.fn().mockReturnValue(mockAlgorithm),
    } as any;

    service = new RateLimiterService(ruleManager, algorithmManager);
    mockAlgorithm.increment.mockClear();
  });

  describe('check', () => {
    it('should look up rule by ruleId', async () => {
      await service.check('client-1', 'default');

      expect(ruleManager.getRule).toHaveBeenCalledWith('default');
    });

    it('should look up algorithm by rule algorithm type', async () => {
      await service.check('client-1', 'default');

      expect(algorithmManager.getAlgorithm).toHaveBeenCalledWith(
        'token-bucket',
      );
    });

    it('should call algorithm.increment with clientId and rule', async () => {
      const rule = {
        algorithm: 'token-bucket' as const,
        limit: 100,
        windowSeconds: 60,
      };

      await service.check('client-1', 'default');

      expect(mockAlgorithm.increment).toHaveBeenCalledWith('client-1', rule);
    });

    it('should return the result from algorithm.increment', async () => {
      const result = await service.check('client-1', 'default');

      expect(result).toEqual(mockResult);
    });

    it('should propagate NotFoundException from rule manager', async () => {
      ruleManager.getRule.mockImplementation(() => {
        throw new NotFoundException('Rate limit rule not found: bad-rule');
      });

      await expect(service.check('client-1', 'bad-rule')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should propagate NotFoundException from algorithm manager', async () => {
      algorithmManager.getAlgorithm.mockImplementation(() => {
        throw new NotFoundException(
          'Rate limiting algorithm not found: bad-algo',
        );
      });

      await expect(service.check('client-1', 'default')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
