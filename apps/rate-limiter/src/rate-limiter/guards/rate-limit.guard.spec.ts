import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitExceededException } from '../exceptions';
import type { RateLimitResult } from '../rate-limiter.types';
import { ClientIdentifierService } from '../services/client-identifier.service';
import { RateLimiterService } from '../services/rate-limiter.service';
import { RateLimitGuard } from './rate-limit.guard';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let reflector: jest.Mocked<Reflector>;
  let rateLimiterService: jest.Mocked<RateLimiterService>;
  let clientIdentifierService: jest.Mocked<ClientIdentifierService>;

  const mockSetHeader = jest.fn();

  const mockContext: ExecutionContext = {
    getHandler: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({}),
      getResponse: () => ({ setHeader: mockSetHeader }),
    }),
  } as unknown as ExecutionContext;

  const allowedResult: RateLimitResult = {
    allowed: true,
    limit: 100,
    remaining: 99,
    resetTime: 1711353600000, // fixed timestamp for predictable testing
  };

  const deniedResult: RateLimitResult = {
    allowed: false,
    limit: 100,
    remaining: 0,
    resetTime: 1711353600000,
  };

  beforeEach(() => {
    reflector = {
      get: jest.fn(),
    } as any;

    rateLimiterService = {
      check: jest.fn().mockResolvedValue(allowedResult),
    } as any;

    clientIdentifierService = {
      identifyClient: jest.fn().mockReturnValue('user:test-123'),
    } as any;

    guard = new RateLimitGuard(
      reflector,
      rateLimiterService,
      clientIdentifierService,
    );

    mockSetHeader.mockClear();
  });

  describe('canActivate', () => {
    it('should return true when no @RateLimit() decorator', async () => {
      reflector.get.mockReturnValue(undefined);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(rateLimiterService.check).not.toHaveBeenCalled();
    });

    it('should return true (fail-open) when client cannot be identified', async () => {
      reflector.get.mockReturnValue({ ruleId: 'default' });
      clientIdentifierService.identifyClient.mockReturnValue(null);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(rateLimiterService.check).not.toHaveBeenCalled();
    });

    it('should call rateLimiterService.check with clientId and ruleId', async () => {
      reflector.get.mockReturnValue({ ruleId: 'strict' });

      await guard.canActivate(mockContext);

      expect(rateLimiterService.check).toHaveBeenCalledWith(
        'user:test-123',
        'strict',
      );
    });

    it('should return true when rate limit check allows', async () => {
      reflector.get.mockReturnValue({ ruleId: 'default' });

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should throw RateLimitExceededException when not allowed', async () => {
      reflector.get.mockReturnValue({ ruleId: 'default' });
      rateLimiterService.check.mockResolvedValue(deniedResult);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        RateLimitExceededException,
      );
    });

    it('should propagate errors from rateLimiterService.check', async () => {
      reflector.get.mockReturnValue({ ruleId: 'default' });
      rateLimiterService.check.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'ECONNREFUSED',
      );
    });

    it('should propagate RateLimitExceededException from check', async () => {
      reflector.get.mockReturnValue({ ruleId: 'default' });
      const exception = new RateLimitExceededException(deniedResult);
      rateLimiterService.check.mockRejectedValue(exception);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        RateLimitExceededException,
      );
    });
  });

  describe('rate limit headers', () => {
    beforeEach(() => {
      reflector.get.mockReturnValue({ ruleId: 'default' });
    });

    it('should set X-RateLimit-Limit header', async () => {
      await guard.canActivate(mockContext);

      expect(mockSetHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 100);
    });

    it('should set X-RateLimit-Remaining header', async () => {
      await guard.canActivate(mockContext);

      expect(mockSetHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 99);
    });

    it('should set X-RateLimit-Reset as Unix seconds (not ms)', async () => {
      await guard.canActivate(mockContext);

      // resetTime is 1711353600000ms → 1711353600 seconds
      expect(mockSetHeader).toHaveBeenCalledWith(
        'X-RateLimit-Reset',
        Math.floor(1711353600000 / 1000),
      );
    });
  });
});
