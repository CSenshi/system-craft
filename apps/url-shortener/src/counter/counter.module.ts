import { Module } from '@nestjs/common';
import { RedisModule } from '@nestjs-modules/ioredis';
import { RedisCounterService } from './redis-counter.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    RedisModule.forRootAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          type: 'single',
          host: configService.getOrThrow<string>('REDIS_HOST'),
        }),
      }
    ),
  ],
  providers: [RedisCounterService],
  exports: [RedisCounterService],
})
export class CounterModule { }
