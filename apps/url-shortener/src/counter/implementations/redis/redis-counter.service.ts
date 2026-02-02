import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-redis/client';
import type { RedisClientType } from 'redis';
import { CounterService } from '../../counter.service';

@Injectable()
export class RedisCounterService extends CounterService {
  constructor(@InjectRedis() private readonly redis: RedisClientType) {
    super();
  }

  async getNextCount(): Promise<number> {
    return await this.redis.incr('global_counter');
  }
}
