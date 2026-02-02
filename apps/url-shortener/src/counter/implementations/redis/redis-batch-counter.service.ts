import { Inject, Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-redis/client';
import type { RedisClientType } from 'redis';
import { COUNTER_BATCH_SIZE } from '../../counter.constants';
import { BatchCounterService } from '../base/batch-counter.service';

@Injectable()
export class RedisBatchCounterService extends BatchCounterService {
  constructor(
    @InjectRedis() private readonly redis: RedisClientType,
    @Inject(COUNTER_BATCH_SIZE) batchSize: number,
  ) {
    super(batchSize);
  }

  protected async reserveBatch(batchSize: number): Promise<number[]> {
    const lastValue = await this.redis.incrBy('global_counter', batchSize);
    const start = lastValue - batchSize + 1;

    return Array.from({ length: batchSize }, (_, index) => start + index);
  }
}
