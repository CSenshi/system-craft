import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { CounterService } from '../counter.service';

@Injectable()
export class RedisCounterService extends CounterService {
  constructor(@InjectRedis() private readonly redis: Redis) {
    super();
  }

  async getNextCount(): Promise<number> {
    return await this.redis.incr('global_counter');
  }
}
