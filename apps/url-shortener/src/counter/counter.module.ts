import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '@nestjs-redis/client';
import { PrismaModule } from '../prisma/prisma.module';
import {
  COUNTER_BATCH_SIZE,
  DEFAULT_COUNTER_BATCH_SIZE,
} from './counter.constants';
import { CounterService } from './counter.service';
import { PostgresBatchCounterService } from './implementations/postgres/postgres-batch-counter.service';
import { PostgresCounterService } from './implementations/postgres/postgres-counter.service';
import { RedisBatchCounterService } from './implementations/redis/redis-batch-counter.service';
import { RedisCounterService } from './implementations/redis/redis-counter.service';

type CounterModuleOptions =
  | { provider: 'redis'; batching?: { size?: number } }
  | { provider: 'pg'; batching?: { size?: number } };

@Module({})
export class CounterModule {
  static forRoot(options: CounterModuleOptions): DynamicModule {
    switch (options.provider) {
      case 'redis':
        return options.batching
          ? this.redisBatchCounterModule(options.batching.size)
          : this.redisCounterModule();
      case 'pg':
        return options.batching
          ? this.pgBatchCounterModule(options.batching.size)
          : this.pgCounterModule();
      default:
        throw new Error('Invalid counter provider specified');
    }
  }

  private static pgCounterModule(): DynamicModule {
    return {
      module: CounterModule,
      imports: [PrismaModule],
      providers: [
        {
          provide: CounterService,
          useClass: PostgresCounterService,
        },
      ],
      exports: [CounterService],
    };
  }

  private static pgBatchCounterModule(batchSize?: number): DynamicModule {
    return {
      module: CounterModule,
      imports: [PrismaModule],
      providers: [
        {
          provide: COUNTER_BATCH_SIZE,
          useValue: batchSize ?? DEFAULT_COUNTER_BATCH_SIZE,
        },
        {
          provide: CounterService,
          useClass: PostgresBatchCounterService,
        },
      ],
      exports: [CounterService],
    };
  }

  private static redisCounterModule(): DynamicModule {
    return {
      module: CounterModule,
      imports: [
        RedisModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            type: 'client',
            options: { url: configService.getOrThrow<string>('REDIS_HOST') },
          }),
        }),
      ],
      providers: [
        {
          provide: CounterService,
          useClass: RedisCounterService,
        },
      ],
      exports: [CounterService],
    };
  }

  private static redisBatchCounterModule(batchSize?: number): DynamicModule {
    return {
      module: CounterModule,
      imports: [
        RedisModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            type: 'client',
            options: { url: configService.getOrThrow<string>('REDIS_HOST') },
          }),
        }),
      ],
      providers: [
        {
          provide: COUNTER_BATCH_SIZE,
          useValue: batchSize ?? DEFAULT_COUNTER_BATCH_SIZE,
        },
        {
          provide: CounterService,
          useClass: RedisBatchCounterService,
        },
      ],
      exports: [CounterService],
    };
  }
}
