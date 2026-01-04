import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RATE_LIMIT_KEY } from '../decorators/rate-limit.decorator';
import { RateLimitExceededException } from '../exceptions';
import { RateLimitResult } from '../rate-limiter.types';
import { ClientIdentifierService } from '../services/client-identifier.service';
import { RateLimiterService } from '../services/rate-limiter.service';

/**
 * Apply this guard globally or to specific routes, then use the @RateLimit()
 * decorator to configure rate limiting behavior.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimiterService: RateLimiterService,
    private readonly clientIdentifierService: ClientIdentifierService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const opts = this.reflector.get(RATE_LIMIT_KEY, context.getHandler());
    if (!opts) {
      return true; // No rate limiting configured - allow request
    }

    const clientId = this.clientIdentifierService.identifyClient(context);
    if (!clientId) {
      return true; // Fail-open: allow if client can't be identified
    }

    const result = await this.rateLimiterService.check(clientId, opts.ruleId);
    this.setRateLimitHeaders(context, result);

    if (!result.allowed) {
      throw new RateLimitExceededException(result);
    }

    return true;
  }

  /**
   * Set rate limit headers on the HTTP response.
   * According to RFC 6585, X-RateLimit-Reset should be a Unix timestamp (seconds since epoch).
   */
  private setRateLimitHeaders(
    context: ExecutionContext,
    { limit, remaining, resetTime }: RateLimitResult,
  ): void {
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-RateLimit-Limit', limit);
    response.setHeader('X-RateLimit-Remaining', remaining);
    response.setHeader('X-RateLimit-Reset', Math.floor(resetTime / 1000));
  }
}
