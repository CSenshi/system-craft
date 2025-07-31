import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';
import { ThrottlerGuard, ThrottlerModule, seconds } from '@nestjs/throttler';
import { RedisThrottlerStorage } from '@nestjs-redis/throttler-storage';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './prisma/prisma.module';
import { UnhandledExceptionsListener } from './unhandled-exceptions.listener';
import { UrlModule } from './url/url.module';

@Module({
  imports: [
    PrismaModule,
    CqrsModule.forRoot(),
    LoggerModule.forRoot({
      pinoHttp: {
        base: {},
        autoLogging: false,
        level: 'debug',
        transport:
          process.env['NODE_ENV'] !== 'production'
            ? { target: 'pino-pretty' }
            : undefined,
      },
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        // Throttler are updated per controller see http.controllers
        throttlers: [{ limit: 1, ttl: seconds(10) }],
        storage: RedisThrottlerStorage.fromClientOptions({
          url: configService.getOrThrow<string>('REDIS_HOST'),
        }),
      }),
    }),
    UrlModule,
  ],
  providers: [
    UnhandledExceptionsListener,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
