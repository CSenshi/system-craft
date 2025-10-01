import { Inject, Injectable } from '@nestjs/common';
import { InjectRedis, type Redis } from '@nestjs-redis/kit';
import { COUNTER_BATCH_SIZE } from '../../counter.constants';
import { BatchCounterService } from '../base/batch-counter.service';

@Injectable()
export class RedisBatchCounterService extends BatchCounterService {
  constructor(
    @InjectRedis() private readonly redis: Redis,
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
