export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number; // Unix timestamp in milliseconds
}

export interface RateLimitConfig {
  limit: number; // Maximum number of requests
  windowSeconds: number; // Time window in seconds
}
