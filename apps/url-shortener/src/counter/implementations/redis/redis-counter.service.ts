import { Injectable } from '@nestjs/common';
import { InjectRedis, type Redis } from '@nestjs-redis/kit';
import { CounterService } from '../../counter.service';

@Injectable()
export class RedisCounterService extends CounterService {
  constructor(@InjectRedis() private readonly redis: Redis) {
    super();
  }

  async getNextCount(): Promise<number> {
    return await this.redis.incr('global_counter');
  }
}
