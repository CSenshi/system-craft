import { Module } from '@nestjs/common';
import { RedisModule } from '@nestjs-redis/kit';
import { FixedWindowAlgorithm } from './algorithms/fixed-window';
import { SlidingWindowCounterAlgorithm } from './algorithms/sliding-window-counter';
import { SlidingWindowLogAlgorithm } from './algorithms/sliding-window-log';

@Module({
  imports: [
    RedisModule.forRoot({
      options: { url: process.env['REDIS_HOST'] || 'redis://localhost:6379' },
      isGlobal: true,
    }),
  ],
  providers: [
    FixedWindowAlgorithm,
    SlidingWindowCounterAlgorithm,
    SlidingWindowLogAlgorithm,
  ],
  exports: [
    FixedWindowAlgorithm,
    SlidingWindowCounterAlgorithm,
    SlidingWindowLogAlgorithm,
  ],
})
export class RateLimiterModule {}
