import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = Symbol('rate_limit');

/**
 * Configuration options for the @RateLimit() decorator.
 */
export interface RateLimitOptions {
  /** Use a predefined rule by ID (e.g., "api-requests") */
  ruleId: string;
}

/**
 * Decorator to apply rate limiting to a route handler or controller.
 */
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);
