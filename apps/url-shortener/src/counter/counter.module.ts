import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';
import { PrismaModule } from '../prisma/prisma.module';
import { CounterService } from './counter.service';
import { PostgresCounterService } from './implementations/postgres-counter.service';
import { RedisCounterService } from './implementations/redis-counter.service';

type CounterModuleOptions =
  | {
      provider: 'redis';
    }
  | {
      provider: 'pg';
    };

@Module({})
export class CounterModule {
  static forRoot(options: CounterModuleOptions): DynamicModule {
    switch (options.provider) {
      case 'redis':
        return this.redisCounterModule();
      case 'pg':
        return this.pgCounterModule();
      default:
        throw new Error('Invalid counter provider specified');
    }
  }

  static pgCounterModule(): DynamicModule {
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

  private static redisCounterModule(): DynamicModule {
    return {
      module: CounterModule,
      imports: [
        ConfigModule,
        RedisModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            type: 'single',
            host: configService.getOrThrow<string>('REDIS_HOST'),
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
}
