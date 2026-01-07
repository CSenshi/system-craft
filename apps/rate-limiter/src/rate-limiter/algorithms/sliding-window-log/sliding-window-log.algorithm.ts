import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-redis/kit';
import type { RedisClusterType } from 'redis';
import { RateLimitConfig, RateLimitResult } from '../../rate-limiter.types';
import { IRateLimitAlgorithm, exectRedisScriptSha } from '../base';
import { SLIDING_WINDOW_LOG_SCRIPT } from './sliding-window-log.script';

@Injectable()
export class SlidingWindowLogAlgorithm implements IRateLimitAlgorithm {
  private scriptMeta = { sha: null, script: SLIDING_WINDOW_LOG_SCRIPT };

  constructor(@InjectRedis() private readonly redis: RedisClusterType) {}

  async increment(
    identifier: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const key = `rate-limit-log:{${identifier}}`;

    const result = await exectRedisScriptSha<[number, number, number]>(
      this.redis,
      this.scriptMeta,
      [key],
      [config.limit.toString(), config.windowSeconds.toString()],
    );

    const [allowedNum, remaining, resetTime] = result;

    return {
      allowed: allowedNum === 1,
      limit: config.limit,
      remaining,
      resetTime,
    };
  }
}
