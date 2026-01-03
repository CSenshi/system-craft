import { RateLimitConfig, RateLimitResult } from '../../rate-limiter.types';

/**
 * Base interface for all rate limiting algorithms.
 * All algorithms must implement this interface to ensure consistency.
 */
export interface IRateLimitAlgorithm {
  /**
   * Check if a request should be allowed based on the current rate limit state.
   *
   * @param identifier - Unique identifier for the client (user ID, IP, API key, etc.)
   * @param config - Rate limit configuration (limit and window size)
   * @returns Promise resolving to rate limit result with allowed status and metadata
   */
  increment(
    identifier: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult>;
}
