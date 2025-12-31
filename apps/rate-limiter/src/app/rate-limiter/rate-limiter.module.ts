import { Module } from '@nestjs/common';
import { RedisModule } from '@nestjs-redis/kit';
import { FixedWindowAlgorithm } from './algorithms/fixed-window';
import { SlidingWindowLogAlgorithm } from './algorithms/sliding-window-log';

@Module({
  imports: [
    RedisModule.forRoot({
      options: { url: process.env['REDIS_HOST'] || 'redis://localhost:6379' },
      isGlobal: true,
    }),
  ],
  providers: [FixedWindowAlgorithm, SlidingWindowLogAlgorithm],
  exports: [FixedWindowAlgorithm, SlidingWindowLogAlgorithm],
})
export class RateLimiterModule {}
