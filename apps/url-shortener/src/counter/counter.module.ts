import { Module } from '@nestjs/common';
import { RedisModule } from '@nestjs-modules/ioredis';
import { RedisCounterService } from './redis-counter.service';

@Module({
  imports: [
    RedisModule.forRoot({
      type: 'single',
      url: 'redis://localhost:6379',
    }),
  ],
  providers: [
    RedisCounterService,
  ],
  exports: [
    RedisCounterService,
  ],
})
export class CounterModule { }
