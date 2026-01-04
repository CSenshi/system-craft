import { HttpException, HttpStatus } from '@nestjs/common';
import { RateLimitResult } from '../rate-limiter.types';

/**
 * Exception thrown when rate limit is exceeded.
 * Includes rate limit metadata for proper HTTP response headers.
 */
export class RateLimitExceededException extends HttpException {
  constructor(
    public readonly rateLimitResult: RateLimitResult,
    message = 'Rate limit exceeded',
  ) {
    super(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message,
        rateLimit: {
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime,
        },
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
