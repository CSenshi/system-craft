import { Module } from '@nestjs/common';
import { RedisModule } from '@nestjs-redis/kit';
import { FixedWindowAlgorithm } from './algorithms/fixed-window';
import { SlidingWindowCounterAlgorithm } from './algorithms/sliding-window-counter';
import { SlidingWindowLogAlgorithm } from './algorithms/sliding-window-log';
import { TokenBucketAlgorithm } from './algorithms/token-bucket';
import { RateLimitController } from './controllers';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { AlgorithmManagerService } from './services/algorithm-manager.service';
import { ClientIdentifierService } from './services/client-identifier.service';
import { RateLimiterService } from './services/rate-limiter.service';
import { RuleManagerService } from './services/rule-manager.service';

@Module({
  imports: [
    RedisModule.forRoot({
      type: 'cluster',
      options: { rootNodes: [{ url: 'redis://localhost:7010' }] },
      isGlobal: true,
    }),
  ],
  controllers: [RateLimitController],
  providers: [
    // Algorithms
    FixedWindowAlgorithm,
    SlidingWindowCounterAlgorithm,
    SlidingWindowLogAlgorithm,
    TokenBucketAlgorithm,
    // Services
    AlgorithmManagerService,
    RuleManagerService,
    ClientIdentifierService,
    RateLimiterService,
    // Guards
    RateLimitGuard,
  ],
  exports: [
    // Algorithms
    FixedWindowAlgorithm,
    SlidingWindowCounterAlgorithm,
    SlidingWindowLogAlgorithm,
    TokenBucketAlgorithm,
    // Services
    AlgorithmManagerService,
    RateLimiterService,
    RuleManagerService,
    ClientIdentifierService,
    // Guards
    RateLimitGuard,
  ],
})
export class RateLimiterModule {}
