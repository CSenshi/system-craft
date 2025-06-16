import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';

@Injectable()
export class RedisCounterService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async getNextCount(): Promise<number> {
    return await this.redis.incr('global_counter');
  }
}
