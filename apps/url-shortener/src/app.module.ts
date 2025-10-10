import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ThrottlerModule, seconds } from '@nestjs/throttler';
import {
  Redis,
  RedisModule,
  RedisThrottlerStorage,
  RedisToken,
} from '@nestjs-redis/kit';
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
        level: 'error',
        transport:
          process.env['NODE_ENV'] !== 'production'
            ? { target: 'pino-pretty' }
            : undefined,
      },
    }),
    ThrottlerModule.forRootAsync({
      imports: [
        RedisModule.forRoot({ options: { url: process.env['REDIS_HOST'] } }),
      ],
      inject: [RedisToken()],
      useFactory: (redis: Redis) => ({
        throttlers: [{ limit: 1, ttl: seconds(10) }],
        storage: new RedisThrottlerStorage(redis),
      }),
    }),
    UrlModule,
  ],
  providers: [
    UnhandledExceptionsListener,
    // {
    //   provide: APP_GUARD,
    //   useClass: ThrottlerGuard,
    // },
  ],
})
export class AppModule {}
