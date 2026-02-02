import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-redis/client';
import type { RedisClusterType } from 'redis';
import { RateLimitConfig, RateLimitResult } from '../../rate-limiter.types';
import { IRateLimitAlgorithm, exectRedisScriptSha } from '../base';
import { FIXED_WINDOW_SCRIPT } from './fixed-window.script';

@Injectable()
export class FixedWindowAlgorithm implements IRateLimitAlgorithm {
  private scriptMeta = { sha: null, script: FIXED_WINDOW_SCRIPT };

  constructor(@InjectRedis() private readonly redis: RedisClusterType) {}

  async increment(
    identifier: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const key = `rate-limit:{${identifier}}`;

    const result = await exectRedisScriptSha<[number, number, number]>(
      this.redis,
      this.scriptMeta,
      [key],
      [config.limit.toString(), config.windowSeconds.toString()],
    );

    const [resetTime, allowedNum, remaining] = result;

    return {
      allowed: allowedNum === 1,
      limit: config.limit,
      remaining,
      resetTime,
    };
  }
}
