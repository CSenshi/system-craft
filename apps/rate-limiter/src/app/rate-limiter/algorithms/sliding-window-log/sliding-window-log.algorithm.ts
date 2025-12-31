import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRedis } from '@nestjs-redis/kit';
import { readFile } from 'fs/promises';
import { join } from 'path';
import type { RedisClientType } from 'redis';
import { RateLimitConfig, RateLimitResult } from '../../rate-limiter.types';

@Injectable()
export class SlidingWindowLogAlgorithm implements OnModuleInit {
  private scriptSha: string;

  constructor(@InjectRedis() private readonly redis: RedisClientType) {}

  async onModuleInit() {
    const scriptPath = join(__dirname, 'sliding-window-log.lua');
    const script = await readFile(scriptPath, 'utf-8');
    this.scriptSha = await this.redis.scriptLoad(script);
  }

  async increment(
    identifier: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const result = (await this.redis.evalSha(this.scriptSha, {
      keys: [identifier],
      arguments: [config.limit.toString(), config.windowSeconds.toString()],
    })) as [number, number];

    const [allowedNum, remaining] = result;

    return {
      allowed: allowedNum === 1,
      limit: config.limit,
      remaining,
      resetTime: 0,
    };
  }
}
