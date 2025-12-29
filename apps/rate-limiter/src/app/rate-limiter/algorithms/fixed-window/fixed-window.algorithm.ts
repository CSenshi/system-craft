import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRedis } from '@nestjs-redis/kit';
import type { RedisClientType } from 'redis';
import { RateLimitConfig, RateLimitResult } from '../../rate-limiter.types';

// Lua script that handles all rate limiting logic atomically
// KEYS[1] = identifier
// ARGV[1] = limit (max requests)
// ARGV[2] = windowSeconds (time window in seconds)
// Returns: {resetTime, allowed, remaining}
const INCREMENT_SCRIPT = `
  local identifier = KEYS[1]
  local limit = tonumber(ARGV[1])
  local windowSeconds = tonumber(ARGV[2])
  
  -- Get current time from Redis (more accurate than client time)
  local time = redis.call('TIME')
  local nowSeconds = tonumber(time[1])
  local nowMicroseconds = tonumber(time[2])
  
  -- Calculate window start (floor division)
  local windowStart = math.floor(nowSeconds / windowSeconds) * windowSeconds
  
  -- Build Redis key
  local key = 'rate-limit:' .. identifier .. ':' .. windowStart
  
  -- Increment counter
  local count = redis.call('INCR', key)
  
  -- Set TTL if this is the first request in the window
  if count == 1 then
    redis.call('EXPIRE', key, windowSeconds)
  end
  
  -- Calculate reset time (window start + window duration) in milliseconds
  local resetTime = (windowStart + windowSeconds) * 1000
  
  -- Calculate allowed and remaining
  local allowed = count <= limit
  local remaining = math.max(0, limit - count)
  
  -- Convert boolean to number (1 = true, 0 = false)
  local allowedNum = allowed and 1 or 0
  
  -- Return all values as a table
  return {resetTime, allowedNum, remaining}
`;

@Injectable()
export class FixedWindowAlgorithm implements OnModuleInit {
  private scriptSha: string;

  constructor(@InjectRedis() private readonly redis: RedisClientType) {}

  async onModuleInit() {
    this.scriptSha = await this.redis.scriptLoad(INCREMENT_SCRIPT);
  }

  async increment(
    identifier: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    // Execute Lua script atomically - all logic happens in Redis
    const result = (await this.redis.evalSha(this.scriptSha, {
      keys: [identifier],
      arguments: [config.limit.toString(), config.windowSeconds.toString()],
    })) as [number, number, number];

    // Lua returns: {resetTime, allowed (0 or 1), remaining}
    const [resetTime, allowedNum, remaining] = result;

    return {
      allowed: allowedNum === 1,
      limit: config.limit,
      remaining,
      resetTime,
    };
  }
}
