import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';

@Injectable()
export class RedisCounterService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async getNextCount(): Promise<number> {
    return await this.redis.incr('global_counter');
  }
}
