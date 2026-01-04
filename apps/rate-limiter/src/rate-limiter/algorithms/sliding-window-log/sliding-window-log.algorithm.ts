import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRedis } from '@nestjs-redis/kit';
import type { RedisClientType } from 'redis';
import { RateLimitConfig, RateLimitResult } from '../../rate-limiter.types';
import { IRateLimitAlgorithm } from '../base';
import { SLIDING_WINDOW_LOG_SCRIPT } from './sliding-window-log.script';

@Injectable()
export class SlidingWindowLogAlgorithm
  implements OnModuleInit, IRateLimitAlgorithm
{
  private scriptSha: string;

  constructor(@InjectRedis() private readonly redis: RedisClientType) {}

  async onModuleInit() {
    this.scriptSha = await this.redis.scriptLoad(SLIDING_WINDOW_LOG_SCRIPT);
  }

  async increment(
    identifier: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const result = (await this.redis.evalSha(this.scriptSha, {
      keys: [identifier],
      arguments: [config.limit.toString(), config.windowSeconds.toString()],
    })) as [number, number, number];

    const [allowedNum, remaining, resetTime] = result;

    return {
      allowed: allowedNum === 1,
      limit: config.limit,
      remaining,
      resetTime,
    };
  }
}
