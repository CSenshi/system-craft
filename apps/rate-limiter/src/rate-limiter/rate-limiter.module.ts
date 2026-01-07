import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
    RedisModule.forRootAsync({
      imports: [ConfigModule.forRoot()],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'cluster',
        options: {
          rootNodes: [{ url: configService.getOrThrow('REDIS_HOST') }],
        },
        isGlobal: true,
      }),
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
