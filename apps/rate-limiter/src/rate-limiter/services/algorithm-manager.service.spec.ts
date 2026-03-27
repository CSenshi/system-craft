import { NotFoundException } from '@nestjs/common';
import type { IRateLimitAlgorithm } from '../algorithms/base';
import type { AlgorithmType } from '../rate-limiter.types';
import { AlgorithmManagerService } from './algorithm-manager.service';

describe('AlgorithmManagerService', () => {
  let service: AlgorithmManagerService;

  // Minimal stubs — just need to be distinguishable objects
  const fixedWindow = {
    name: 'fixed-window',
  } as unknown as IRateLimitAlgorithm;
  const slidingWindowLog = {
    name: 'sliding-window-log',
  } as unknown as IRateLimitAlgorithm;
  const slidingWindowCounter = {
    name: 'sliding-window-counter',
  } as unknown as IRateLimitAlgorithm;
  const tokenBucket = {
    name: 'token-bucket',
  } as unknown as IRateLimitAlgorithm;

  beforeEach(() => {
    service = new AlgorithmManagerService(
      fixedWindow as any,
      slidingWindowLog as any,
      slidingWindowCounter as any,
      tokenBucket as any,
    );
    service.onModuleInit();
  });

  describe('getAlgorithm', () => {
    const cases: { type: AlgorithmType; expected: IRateLimitAlgorithm }[] = [
      { type: 'fixed-window', expected: fixedWindow },
      { type: 'sliding-window-log', expected: slidingWindowLog },
      { type: 'sliding-window-counter', expected: slidingWindowCounter },
      { type: 'token-bucket', expected: tokenBucket },
    ];

    it.each(cases)(
      'should return $type algorithm after init',
      ({ type, expected }) => {
        expect(service.getAlgorithm(type)).toBe(expected);
      },
    );

    it('should throw NotFoundException for unknown algorithm type', () => {
      expect(() => service.getAlgorithm('unknown' as AlgorithmType)).toThrow(
        NotFoundException,
      );
      expect(() => service.getAlgorithm('unknown' as AlgorithmType)).toThrow(
        'Rate limiting algorithm not found: unknown',
      );
    });
  });
});
